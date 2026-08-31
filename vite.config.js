import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import {
  RECOMMENDATION_SCHEMA,
  GAP_ANALYSIS_SCHEMA,
  buildRecommendationPrompt,
  buildGapAnalysisPrompt,
  callGemini,
} from "./api/_gemini.js";
import {
  extractDocxChunks,
  extractEvidenceFromDocx,
  extractEvidenceFromPdf,
  normalizeValue,
  evaluateControlLibrary,
} from "./api/_evidenceExtraction.js";
import { checkGithubRepo } from "./api/_github.js";

// Local dev only. In production (Vercel), the same logic runs as real
// serverless functions in api/ai-recommendations.js and api/gap-analysis.js —
// both share this exact prompt/schema/callGemini code from api/_gemini.js,
// so dev and prod behavior can't drift apart.

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || "{}");
}

function geminiPlugin(env) {
  const apiKey = env.GEMINI_API_KEY;
  return {
    name: "gemini-ai",
    configureServer(server) {
      server.middlewares.use("/api/ai-recommendations", async (req, res) => {
        if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
        if (!apiKey) return sendJson(res, 500, { error: "GEMINI_API_KEY is not set on the server (.env)" });
        try {
          const payload = await readJsonBody(req);
          const prompt = buildRecommendationPrompt(payload);
          const parsed = await callGemini(apiKey, {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            schema: RECOMMENDATION_SCHEMA,
          });
          sendJson(res, 200, parsed);
        } catch (err) {
          sendJson(res, err.status || 500, { error: String(err.message || err) });
        }
      });

      server.middlewares.use("/api/gap-analysis", async (req, res) => {
        if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
        if (!apiKey) return sendJson(res, 500, { error: "GEMINI_API_KEY is not set on the server (.env)" });
        try {
          const payload = await readJsonBody(req);
          const { company, scope, frameworks, security, documents, documentTypesNotProvided } = payload;
          if (!documents || documents.length === 0) return sendJson(res, 400, { error: "At least one document is required" });

          const documentTypesProvided = documents.map((d) => d.type);
          const prompt = buildGapAnalysisPrompt({
            company,
            scope,
            frameworks,
            security,
            documentTypesProvided,
            documentTypesNotProvided: documentTypesNotProvided || [],
          });

          const parts = [{ text: prompt }];
          for (const doc of documents) {
            parts.push({ text: `Document: ${doc.type} (file: ${doc.fileName})` });
            parts.push({ inlineData: { mimeType: doc.fileMimeType || "application/pdf", data: doc.fileBase64 } });
          }

          const parsed = await callGemini(apiKey, {
            contents: [{ role: "user", parts }],
            schema: GAP_ANALYSIS_SCHEMA,
          });
          sendJson(res, 200, parsed);
        } catch (err) {
          sendJson(res, err.status || 500, { error: String(err.message || err) });
        }
      });

      server.middlewares.use("/api/evidence-extract", async (req, res) => {
        if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
        if (!apiKey) return sendJson(res, 500, { error: "GEMINI_API_KEY is not set on the server (.env)" });
        try {
          const { fileName, fileMimeType, fileBase64 } = await readJsonBody(req);
          if (!fileBase64) return sendJson(res, 400, { error: "fileBase64 is required" });

          const isPdf = fileMimeType === "application/pdf" || /\.pdf$/i.test(fileName || "");
          const isDocx = /\.docx$/i.test(fileName || "") || fileMimeType?.includes("wordprocessingml");
          if (!isPdf && !isDocx) {
            return sendJson(res, 400, { error: "Only PDF and DOCX are supported for evidence extraction right now" });
          }

          let rawItems;
          if (isPdf) {
            rawItems = await extractEvidenceFromPdf(fileBase64, apiKey);
          } else {
            const buffer = Buffer.from(fileBase64, "base64");
            const chunks = await extractDocxChunks(buffer);
            rawItems = await extractEvidenceFromDocx(chunks, apiKey);
          }

          const evidenceRecords = rawItems.map((item) => {
            const { normalized, requiresReview } = normalizeValue(item.extracted_value);
            return {
              evidence_type: item.evidence_type || "policy_requirement",
              title: item.title || "",
              subject: item.subject || null,
              attribute: item.attribute || null,
              extracted_value: item.extracted_value ?? null,
              normalized_value: normalized,
              requiresReview,
              confidence_score: Number(item.confidence || 0),
              source_location: item.source_location || "unknown",
            };
          });

          const controlResults = evaluateControlLibrary(evidenceRecords).map((c) => ({
            name: c.name,
            overall: c.overall,
            verdicts: c.verdicts.map((v) => ({
              attribute: v.rule.attribute,
              result: v.result,
              reasoning: v.reasoning,
              sourceLocation: v.matchedEvidence?.source_location || null,
            })),
          }));

          sendJson(res, 200, { fileName, evidenceCount: evidenceRecords.length, evidence: evidenceRecords, controlResults });
        } catch (err) {
          sendJson(res, err.status || 500, { error: String(err.message || err) });
        }
      });

      server.middlewares.use("/api/github-connector", async (req, res) => {
        if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
        try {
          const body = await readJsonBody(req);
          const result = await checkGithubRepo(body);
          sendJson(res, 200, result);
        } catch (err) {
          sendJson(res, err.status || 500, { error: String(err.message || err) });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), geminiPlugin(env)],
    server: {
      port: 5173,
    },
  };
});
