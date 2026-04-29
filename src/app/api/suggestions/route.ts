import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    // client=firefox returns a clean JSON array: ["query", ["suggestion1", "suggestion2", ...]]
    const response = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(
        query,
      )}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = await response.json();
    const suggestions = data[1] || [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Suggestions API error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
