import { NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY?.trim()?.replace(/^["']|["']$/g, '');
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

// In-memory cache to save quota and speed up repeated searches
const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const pageToken = searchParams.get('pageToken');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const cacheKey = `${query.toLowerCase()}_${pageToken || ''}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // Strategy 1: Official YouTube Data API (if key exists)
  if (YOUTUBE_API_KEY) {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      key: YOUTUBE_API_KEY,
      type: 'video',
      maxResults: '12',
      ...(pageToken && { pageToken }),
    });

    try {
      const response = await fetch(`${YOUTUBE_API_URL}?${params.toString()}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        const videos = (data.items || []).map((video: any) => ({
          videoId: video.id.videoId,
          title: video.snippet.title,
          thumbnail:
            video.snippet.thumbnails.medium?.url ||
            video.snippet.thumbnails.default?.url ||
            `https://img.youtube.com/vi/${video.id.videoId}/mqdefault.jpg`,
          channel: video.snippet.channelTitle,
        }));

        const result = {
          videos,
          nextPageToken: data.nextPageToken || null,
        };

        searchCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return NextResponse.json(result);
      }

      // If Quota Exceeded (429) or other API error, gracefully fall back
      const errorData = await response.json().catch(() => ({}));
      console.warn('YouTube API 429/Quota limit reached. Falling back to public search instances...', errorData);
    } catch (err) {
      console.warn('YouTube API request failed or timed out. Falling back to public search instances...');
    }
  }

  // Strategy 2: Invidious Instances Fallback (Unlimited, no quota limit)
  const invidiousEndpoints = [
    `https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
    `https://yt.artemislena.eu/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
    `https://invidious.nerdvpn.de/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
    `https://invidious.drgns.space/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
  ];

  for (const endpoint of invidiousEndpoints) {
    try {
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const videos = items
            .filter((item: any) => item.type === 'video' || item.videoId)
            .slice(0, 15)
            .map((item: any) => ({
              videoId: item.videoId,
              title: item.title,
              thumbnail:
                item.videoThumbnails?.[0]?.url ||
                `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`,
              channel: item.author || 'YouTube Channel',
            }));

          const result = {
            videos,
            nextPageToken: null,
          };

          searchCache.set(cacheKey, { data: result, timestamp: Date.now() });
          return NextResponse.json(result);
        }
      }
    } catch {
      // Try next instance
    }
  }

  // Strategy 3: Piped Search Fallback
  const pipedEndpoints = [
    `https://pipedapi.adminforge.de/search?q=${encodeURIComponent(query)}&filter=videos`,
    `https://pipedapi.leptons.xyz/search?q=${encodeURIComponent(query)}&filter=videos`,
    `https://api.piped.private.coffee/search?q=${encodeURIComponent(query)}&filter=videos`,
  ];

  for (const endpoint of pipedEndpoints) {
    try {
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        if (Array.isArray(items) && items.length > 0) {
          const videos = items
            .slice(0, 15)
            .map((item: any) => {
              const videoId = (item.url || '').replace('/watch?v=', '') || item.id;
              return {
                videoId,
                title: item.title,
                thumbnail:
                  item.thumbnail ||
                  `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                channel: item.uploaderName || 'YouTube Channel',
              };
            })
            .filter((v: any) => Boolean(v.videoId));

          const result = {
            videos,
            nextPageToken: null,
          };

          searchCache.set(cacheKey, { data: result, timestamp: Date.now() });
          return NextResponse.json(result);
        }
      }
    } catch {
      // Try next instance
    }
  }

  return NextResponse.json(
    { error: 'Search temporarily unavailable. Please try again in a few moments.' },
    { status: 503 }
  );
}
