// Shared Gemini logic for Vercel serverless functions (api/ai-recommendations.js, api/gap-analysis.js).
// Mirrors the dev-only Vite middleware in vite.config.js so behavior stays identical
// between `npm run dev` (local) and the deployed Vercel functions (production).

const GEMINI_MODEL = "gemini-flash-lite-latest";

export const RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          complianceDelta: { type: "string" },
          riskDelta: { type: "string" },
          effort: { type: "string", enum: ["Low", "Medium", "High"] },
          frameworks: { type: "array", items: { type: "string" } },
        },
        required: ["title", "body", "complianceDelta", "riskDelta", "effort", "frameworks"],
      },
    },
  },
  required: ["recommendations"],
};

export const GAP_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    overallSummary: { type: "string" },
    riskControlGaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          risk: { type: "string" },
          riskLevel: { type: "string", enum: ["Critical", "High", "Medium", "Low"] },
          riskScore: { type: "integer" },
          control: { type: "string" },
          controlDescription: { type: "string" },
          frameworkMapping: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                controlRef: { type: "string" },
                status: { type: "string", enum: ["Implemented", "Partial", "Not Implemented", "Not Applicable"] },
              },
              required: ["code", "controlRef", "status"],
            },
          },
          evidenceStatus: { type: "string", enum: ["Valid", "Partial", "Missing"] },
          evidenceNote: { type: "string" },
          gap: { type: "string" },
          remediation: { type: "string" },
        },
        required: ["risk", "riskLevel", "riskScore", "control", "controlDescription", "frameworkMapping", "evidenceStatus", "evidenceNote", "gap", "remediation"],
      },
    },
    frameworkCompliance: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          percentage: { type: "integer" },
          summary: { type: "string" },
        },
        required: ["code", "percentage", "summary"],
      },
    },
  },
  required: ["overallSummary", "riskControlGaps", "frameworkCompliance"],
};

export function buildRecommendationPrompt({ org, frameworks, controls, risks }) {
  const controlLines = Object.entries(controls)
    .flatMap(([fw, statuses]) => Object.entries(statuses).map(([code, status]) => `${fw} ${code}: ${status}`))
    .join("\n");
  const riskLines = risks
    .map((r) => `${r.framework} ${r.code} "${r.title}" — likelihood ${r.likelihood}, impact ${r.impact}, status ${r.status}`)
    .join("\n");

  return `You are a cybersecurity compliance analyst reviewing an organization's real control implementation status across multiple frameworks.

Organization: ${org.name} (${org.size}, ${org.industry})
Frameworks in scope: ${frameworks.map((f) => f.name).join(", ")}

Control implementation status:
${controlLines}

Open risks:
${riskLines || "None recorded"}

Based ONLY on the data above, produce 3 to 5 ranked, actionable recommendations to close the highest-impact compliance gaps. For each recommendation estimate a realistic compliance score delta (e.g. "+6%") and risk reduction delta (e.g. "-18%") that a fix would plausibly produce given the data, and an effort level. Cite which frameworks each recommendation affects. Be specific to the actual not_implemented / partial controls and open risks listed above — do not invent controls that aren't listed.`;
}

const CORE_FRAMEWORKS = [
  { code: "ISO27001", name: "ISO/IEC 27001:2022", refStyle: 'decimal clause numbers, e.g. "8.7", "5.15", "8.24"' },
  { code: "SAMA", name: "SAMA CSF", refStyle: 'dot-numbered domain codes, e.g. "3.2", "2.1"' },
  { code: "NCAECC", name: "NCA ECC-1:2024", refStyle: 'dash-numbered domain codes, e.g. "2-3-3", "2-13-2"' },
];

export function buildGapAnalysisPrompt({ company, scope, frameworks, security, documentTypesProvided, documentTypesNotProvided }) {
  const securityLines = security.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n");
  return `You are a cybersecurity compliance analyst performing a real gap analysis for an organization, using their company profile, assessment scope, self-assessment answers, and the attached documents (each provided as a PDF, immediately preceded by a text label identifying which document type it is).

Company profile:
- Name: ${company.name}
- Industry: ${company.industry}
- Employees: ${company.employees}
- Main services: ${company.services}

Assessment scope:
- Part of organization assessed: ${scope.part}
- Systems included: ${scope.systems.join(", ") || "None specified"}
- Data types handled: ${scope.dataTypes.join(", ") || "None specified"}

Frameworks selected for the overall compliance percentage (use the exact "code" value shown in your "frameworkCompliance[].code" field):
${frameworks.map((f) => `- code: ${f.code} — ${f.name}`).join("\n")}

Existing security self-assessment:
${securityLines}

Documents provided for review: ${documentTypesProvided.length ? documentTypesProvided.join(", ") : "None"}
Documents NOT provided (treat their absence as a potential gap, weighed against what the self-assessment answers say): ${documentTypesNotProvided.length ? documentTypesNotProvided.join(", ") : "None — all standard documents were provided"}

Read every attached document carefully (each is labeled with its document type right before its content) and cross-reference them against the company profile, scope, and self-assessment answers above. Then build your analysis strictly following this chain for every finding: RISK → CONTROL → the 3 frameworks (ISO27001, SAMA, NCAECC) → EVIDENCE → GAP → REMEDIATION.

1. Identify 4 to 6 concrete RISKS implied by the scope, the documents, and the answers (e.g. unauthorized access, unencrypted data at rest, no tested backups, no incident response capability). Do not invent risks that have no basis in the provided material.
2. For each risk, name the single CONTROL that would mitigate it (e.g. "Multi-factor authentication", "Encryption at rest"), with a one-sentence controlDescription of what that control requires.
3. Map that control to its corresponding control reference in ALL THREE core frameworks — ISO27001, SAMA, and NCAECC — even if a framework isn't in the selected scope above. Use realistic control reference formats per framework:
${CORE_FRAMEWORKS.map((f) => `   - ${f.code}: ${f.refStyle}`).join("\n")}
   For each of the 3, give an implementation status (Implemented / Partial / Not Implemented / Not Applicable) grounded in the actual evidence.
4. Assess EVIDENCE for that control: evidenceStatus is "Valid" if a provided document clearly demonstrates the control is implemented, "Partial" if there's weak or indirect support, or "Missing" if no document or answer supports it. evidenceNote explains what was found or what's missing, citing the specific document (or its absence) that led to this call.
5. State the GAP: what's actually missing and its consequence, plus an overall riskLevel (Critical/High/Medium/Low) and riskScore (0-100) for this risk.
6. Give a concrete, actionable REMEDIATION — the specific next step that would close this gap.

Then, separately, for each framework in the selected scope, estimate an overall realistic compliance percentage (0-100) with a one-sentence justification for "frameworkCompliance".

Finally write a 2-3 sentence overall executive summary of the organization's real security posture based on this analysis.

Be specific and grounded in the actual document content, scope, and answers — do not produce generic boilerplate.`;
}

export async function callGemini(apiKey, { contents, schema }) {
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    }
  );
  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    const err = new Error(`AI service error: ${errText}`);
    err.status = geminiRes.status;
    throw err;
  }
  const data = await geminiRes.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text);
}
