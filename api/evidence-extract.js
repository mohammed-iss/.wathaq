import {
  extractDocxChunks,
  extractEvidenceFromDocx,
  extractEvidenceFromPdf,
  normalizeValue,
  evaluateControlLibrary,
} from "./_evidenceExtraction.js";

export const config = {
  api: {
    bodyParser: { sizeLimit: "25mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not set on the server" });

  try {
    const { fileName, fileMimeType, fileBase64 } = req.body;
    if (!fileBase64) return res.status(400).json({ error: "fileBase64 is required" });

    const isPdf = fileMimeType === "application/pdf" || /\.pdf$/i.test(fileName || "");
    const isDocx = /\.docx$/i.test(fileName || "") || fileMimeType?.includes("wordprocessingml");

    if (!isPdf && !isDocx) {
      return res.status(400).json({ error: "Only PDF and DOCX are supported for evidence extraction right now" });
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

    res.status(200).json({
      fileName,
      evidenceCount: evidenceRecords.length,
      evidence: evidenceRecords,
      controlResults,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err.message || err) });
  }
}
