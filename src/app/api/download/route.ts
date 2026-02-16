import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { videoId, format, quality } = req.body;
  if (!videoId) return res.status(400).json({ error: "Missing id" });

  try {
    const api = "https://co.wuk.sh/api/json";
    const body = {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      vQuality: format === "audio" ? "worst" : quality === "highest" ? "best" : quality,
      aFormat: format === "audio" ? "mp3" : "best",
      filename: "media",
    };

    const r = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();

    if (data.status !== "ok" || !data.url?.length) throw new Error("API error");

    res.json({ downloadUrl: data.url[0].url, filename: data.url[0].filename });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}