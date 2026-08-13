import { RECOMMENDATION_SCHEMA, buildRecommendationPrompt, callGemini } from "./_gemini.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not set on the server" });

  try {
    const prompt = buildRecommendationPrompt(req.body);
    const parsed = await callGemini(apiKey, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      schema: RECOMMENDATION_SCHEMA,
    });
    res.status(200).json(parsed);
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err.message || err) });
  }
}
