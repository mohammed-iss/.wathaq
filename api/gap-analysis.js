import { GAP_ANALYSIS_SCHEMA, buildGapAnalysisPrompt, callGemini } from "./_gemini.js";

export const config = {
  api: {
    bodyParser: { sizeLimit: "25mb" }, // uploaded PDFs travel as base64 in the JSON body
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not set on the server" });

  try {
    const { company, scope, frameworks, security, documents, documentTypesNotProvided } = req.body;
    if (!documents || documents.length === 0) return res.status(400).json({ error: "At least one document is required" });

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
    res.status(200).json(parsed);
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err.message || err) });
  }
}
