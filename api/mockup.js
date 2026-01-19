import { GoogleGenAI } from "@google/genai";

export const config = {
  api: { bodyParser: { sizeLimit: "2mb" } }
};

// If you're going to use Shopify App Proxy, you can remove CORS entirely.
// For direct calls from Shopify theme to Vercel, keep this and lock it down later.
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // recommended later: https://birdiesembroidery.com
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const { product, monogram, threadColor } = req.body || {};

    if (!product?.prompt || !monogram || !threadColor) {
      return res.status(400).send("Missing required fields.");
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return res.status(500).send("Missing GOOGLE_API_KEY env var.");

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Generate a high-resolution, professional commercial product photography of ${product.prompt}
The product should have a beautifully embroidered monogram "${String(monogram).toUpperCase()}" on the left chest or top corner.
The embroidery thread should be a sophisticated ${threadColor} silk.
Style: High-end boutique, Palm Beach 1960s aesthetic, sharp focus, 4k.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    const parts = response?.candidates?.[0]?.content?.parts || [];
    let base64 = null;
    let mime = "image/png";

    for (const p of parts) {
      if (p.inlineData?.data) {
        base64 = p.inlineData.data;
        mime = p.inlineData.mimeType || mime;
        break;
      }
    }

    if (!base64) return res.status(502).send("No image returned from model.");

    return res.status(200).json({ base64, mime });
  } catch (e) {
    console.error(e);
    return res.status(500).send("Generation failed.");
  }
}
