import ytdl from "ytdl-core"; // npm i ytdl-core@latest
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { videoId, format, quality } = req.body;
  if (!videoId || !ytdl.validateID(videoId))
    return res.status(400).json({ error: "Invalid id" });

  try {
    const info = await ytdl.getInfo(videoId);
    const formats = ytdl.filterFormats(
      info.formats,
      format === "audio" ? "audioonly" : "videoandaudio"
    );

    let picked = formats[0];
    if (format === "video" && quality !== "highest") {
      const wanted = parseInt(quality, 10);
      const exact = formats.find((f) => f.height === wanted);
      if (exact) picked = exact;
    }

    // Return the googlevideo URL – browser will stream it straight to disk
    return res.json({
      downloadUrl: picked.url,
      filename: `${info.videoDetails.title}.${
        format === "audio" ? "mp3" : "mp4"
      }`,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
