// Deterministic evidence-extraction pipeline for the live Evidence page.
// Mirrors wathaq/backend/app/services/{extraction,rules_engine}.py exactly in
// spirit -- Gemini only extracts candidate statements (step 3); PASS/FAIL is a
// plain, auditable comparison in JS (evaluateControl), never an LLM decision.
// Kept fully additive: this never touches the existing simulated evidence table
// (EVIDENCE_SEED / uploadEvidence) in src/App.jsx.

import mammoth from "mammoth";
import { callGemini } from "./_gemini.js";

// --- DOCX -> traceable chunks, one per numbered policy clause ------------------

const CLAUSE_RE = /^(\d{1,2}(?:-\d{1,2}){0,3})\s+(.+)$/;

export async function extractDocxChunks(fileBuffer) {
  const { value: rawText } = await mammoth.extractRawText({ buffer: fileBuffer });
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  const chunks = [];
  let currentClause = null;
  let currentText = [];

  const flush = () => {
    if (currentText.length === 0) return;
    const text = currentText.join(" ").trim();
    if (!text) return;
    const location = currentClause ? `section ${currentClause}` : `paragraph ${chunks.length + 1}`;
    chunks.push({ text, sourceLocation: location });
  };

  for (const raw of lines) {
    const match = raw.match(CLAUSE_RE);
    if (match) {
      flush();
      currentClause = match[1];
      currentText = [match[2]];
    } else if (currentClause !== null && raw.length < 400) {
      currentText.push(raw);
    } else {
      flush();
      currentClause = null;
      currentText = [raw];
    }
  }
  flush();
  return chunks;
}

// --- Gemini extraction (structured output, same schema shape as the Python side) --

const EVIDENCE_SCHEMA = {
  type: "object",
  properties: {
    evidence_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          evidence_type: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          subject: { type: "string" },
          attribute: { type: "string" },
          extracted_value: { type: "string" },
          unit: { type: "string" },
          confidence: { type: "number" },
          source_location: { type: "string" },
        },
        required: ["evidence_type", "title", "extracted_value", "source_location", "confidence"],
      },
    },
  },
  required: ["evidence_items"],
};

function buildDocxPrompt(chunks) {
  const labeled = chunks.map((c) => `LOCATION_TAG: ${c.sourceLocation}\nTEXT: ${c.text}`).join("\n\n");
  return `You are a compliance analyst extracting structured evidence from an organization's \
policy document. Each block below has a LOCATION_TAG giving its exact location in the source document.

${labeled}

Extract every concrete, checkable compliance requirement or statement (e.g. password rules, \
MFA requirements, encryption requirements, authorization requirements, review cadences). A single \
block may state more than one distinct, separately-checkable requirement -- extract each one as its \
own item, don't merge them. For each item return:
- evidence_type: a short category, e.g. "policy_requirement"
- title: a short human-readable label
- description: one sentence, in your own words, describing what the statement requires
- subject: the thing the requirement is about, in lowercase snake_case, SINGULAR (e.g. "password" \
not "passwords"), e.g. "password", "privileged_account", "external_storage_medium"
- attribute: the specific property being constrained, in lowercase snake_case, e.g. "minimum_length", \
"sharing_prohibited", "requires_periodic_change", "requires_prior_authorization", "encryption_required"
- extracted_value: the value AS STATED in the text -- a number if one is given (e.g. "12"), \
otherwise "true" if the text states the requirement applies / is prohibited / is required, "false" if it \
explicitly states the opposite
- unit: the unit if extracted_value is numeric (e.g. "characters"), otherwise omit
- confidence: 0.0-1.0, how directly the text supports this exact extraction
- source_location: copy the LOCATION_TAG value EXACTLY (just the tag's own text, no brackets, no \
"LOCATION_TAG:" prefix) from the block the statement came from -- never invent one

Only extract what the text actually says. Do not infer requirements the document doesn't state.`;
}

function buildPdfPrompt() {
  return `You are a compliance analyst extracting structured evidence from an organization's policy \
PDF (attached). Read the whole document. Extract every concrete, checkable compliance requirement or \
statement (e.g. password rules, MFA requirements, encryption requirements, authorization requirements, \
review cadences). A single passage may state more than one distinct, separately-checkable requirement \
-- extract each one as its own item, don't merge them. For each item return:
- evidence_type: a short category, e.g. "policy_requirement"
- title: a short human-readable label
- description: one sentence, in your own words, describing what the statement requires
- subject: the thing the requirement is about, in lowercase snake_case, SINGULAR (e.g. "password" \
not "passwords")
- attribute: the specific property being constrained, in lowercase snake_case, e.g. "minimum_length", \
"sharing_prohibited", "requires_periodic_change", "requires_prior_authorization", "encryption_required"
- extracted_value: the value AS STATED in the text -- a number if one is given, otherwise "true"/"false"
- unit: the unit if extracted_value is numeric, otherwise omit
- confidence: 0.0-1.0, how directly the text supports this exact extraction
- source_location: the page number, formatted exactly as "page N"

Only extract what the text actually says. Do not infer requirements the document doesn't state.`;
}

export async function extractEvidenceFromDocx(chunks, apiKey) {
  if (chunks.length === 0) return [];
  const prompt = buildDocxPrompt(chunks);
  const parsed = await callGemini(apiKey, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    schema: EVIDENCE_SCHEMA,
  });
  return cleanItems(parsed.evidence_items || []);
}

export async function extractEvidenceFromPdf(fileBase64, apiKey) {
  const prompt = buildPdfPrompt();
  const parsed = await callGemini(apiKey, {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: fileBase64 } }],
      },
    ],
    schema: EVIDENCE_SCHEMA,
  });
  return cleanItems(parsed.evidence_items || []);
}

function cleanItems(items) {
  // Defensive: strip stray brackets/prefixes even if the model doesn't follow the
  // "just the tag text" instruction exactly.
  return items.map((item) => ({
    ...item,
    source_location: String(item.source_location || "")
      .trim()
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .replace(/^LOCATION_TAG:\s*/, "")
      .trim(),
  }));
}

// --- Normalization ---------------------------------------------------------------

const TRUE_WORDS = new Set(["yes", "enabled", "active", "required", "true", "mandatory", "prohibited"]);
const FALSE_WORDS = new Set(["no", "disabled", "not enabled", "false", "not required", "not mandatory"]);

export function normalizeValue(extractedValue) {
  if (extractedValue == null) return { normalized: null, requiresReview: true };
  const raw = String(extractedValue).trim();
  if (!raw) return { normalized: null, requiresReview: true };

  const asFloat = Number(raw);
  if (!Number.isNaN(asFloat) && raw !== "") {
    return { normalized: String(asFloat), requiresReview: false };
  }

  const lowered = raw.toLowerCase();
  if (TRUE_WORDS.has(lowered)) return { normalized: "true", requiresReview: false };
  if (FALSE_WORDS.has(lowered)) return { normalized: "false", requiresReview: false };

  return { normalized: raw, requiresReview: true };
}

// --- Deterministic rules engine ---------------------------------------------------
// Same design as app/services/rules_engine.py: pure comparison, no LLM call, ever.

export const CONTROL_LIBRARY = [
  {
    name: "Password sharing must be prohibited",
    rules: [{ subject: "password", attribute: "sharing_prohibited", operator: "present" }],
  },
  {
    name: "Passwords must be changed periodically",
    rules: [{ subject: "password", attribute: "requires_periodic_change", operator: "present" }],
  },
  {
    name: "External storage media requires prior authorization",
    rules: [{ subject: "external_storage_media", attribute: "requires_prior_authorization", operator: "present" }],
  },
  {
    name: "Minimum password length",
    rules: [{ subject: "password", attribute: "minimum_length", operator: "gte", expectedValue: "12" }],
  },
];

function looseKey(value) {
  if (!value) return "";
  const v = String(value).trim().toLowerCase();
  return v.endsWith("s") && !v.endsWith("ss") ? v.slice(0, -1) : v;
}

function selectCandidate(rule, evidenceRecords) {
  const candidates = evidenceRecords.filter(
    (e) =>
      looseKey(e.attribute) === looseKey(rule.attribute) &&
      (rule.subject == null || looseKey(e.subject) === looseKey(rule.subject))
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, e) => (e.confidence_score > best.confidence_score ? e : best));
}

function evaluateRule(rule, evidenceRecords) {
  const candidate = selectCandidate(rule, evidenceRecords);
  if (!candidate) {
    return { rule, result: "not_assessed", reasoning: "No evidence extracted for this attribute.", matchedEvidence: null };
  }
  if (candidate.requiresReview || candidate.normalized_value == null) {
    return {
      rule, result: "requires_review",
      reasoning: `Extracted value "${candidate.extracted_value}" (${candidate.source_location}) could not be normalized automatically -- needs human review.`,
      matchedEvidence: candidate,
    };
  }
  if (rule.operator === "present") {
    return {
      rule, result: "pass",
      reasoning: `Evidence found: "${candidate.extracted_value}" (${candidate.source_location}).`,
      matchedEvidence: candidate,
    };
  }

  const actual = Number(candidate.normalized_value);
  const expected = Number(rule.expectedValue);
  if (Number.isNaN(actual) || Number.isNaN(expected)) {
    return { rule, result: "requires_review", reasoning: "Value is not numeric -- cannot compare.", matchedEvidence: candidate };
  }
  const passed = rule.operator === "gte" ? actual >= expected : rule.operator === "lte" ? actual <= expected : actual === expected;
  const verdict = passed ? "pass" : "fail";
  return {
    rule, result: verdict,
    reasoning: `${actual} ${rule.operator} ${expected} -> ${verdict.toUpperCase()} (evidence: ${candidate.source_location})`,
    matchedEvidence: candidate,
  };
}

export function aggregate(results) {
  if (results.length === 0) return "not_assessed";
  if (results.every((r) => r === "pass")) return "pass";
  if (results.some((r) => r === "pass") && results.some((r) => r === "fail")) return "partial";
  if (results.every((r) => r === "fail")) return "fail";
  if (results.some((r) => r === "requires_review")) return "requires_review";
  return "not_assessed";
}

export function evaluateControlLibrary(evidenceRecords) {
  return CONTROL_LIBRARY.map((control) => {
    const verdicts = control.rules.map((rule) => evaluateRule(rule, evidenceRecords));
    return { name: control.name, overall: aggregate(verdicts.map((v) => v.result)), verdicts };
  });
}
