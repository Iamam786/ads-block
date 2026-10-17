import { NextResponse } from "next/server";

// In-memory cache for query suggestions (cleared automatically on server restart)
const suggestionsCache = new Map<string, { data: string[]; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ suggestions: [] });
  }

  const cacheKey = query.toLowerCase();
  const cached = suggestionsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ suggestions: cached.data });
  }

  // Strategy 1: Google YouTube Suggest Queries with strict 1.5s timeout (prevents 10s hang)
  try {
    const response = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`,
      {
        signal: AbortSignal.timeout(1500),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const suggestions = (data[1] || []).slice(0, 10);
      suggestionsCache.set(cacheKey, { data: suggestions, timestamp: Date.now() });
      return NextResponse.json({ suggestions });
    }
  } catch {
    // Timeout or network error - continue to fallback
  }

  // Strategy 2: DuckDuckGo autocomplete fallback (fast and reliable)
  try {
    const ddgRes = await fetch(
      `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`,
      {
        signal: AbortSignal.timeout(1500),
      }
    );

    if (ddgRes.ok) {
      const ddgData = await ddgRes.json();
      const suggestions = (ddgData[1] || []).slice(0, 10);
      if (suggestions.length > 0) {
        suggestionsCache.set(cacheKey, { data: suggestions, timestamp: Date.now() });
        return NextResponse.json({ suggestions });
      }
    }
  } catch {
    // Ignore fallback error
  }

  return NextResponse.json({ suggestions: [] });
}
