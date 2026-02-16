import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { videoId, format, quality } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: "Missing id" },
        { status: 400 }
      );
    }

    const api = "https://co.wuk.sh/api/json";

    const body = {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      vQuality:
        format === "audio"
          ? "worst"
          : quality === "highest"
          ? "best"
          : quality,
      aFormat: format === "audio" ? "mp3" : "best",
      filename: "media",
    };

    const r = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await r.json();

    if (data.status !== "ok" || !data.url?.length) {
      throw new Error("API error");
    }

    return NextResponse.json({
      downloadUrl: data.url[0].url,
      filename: data.url[0].filename,
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
