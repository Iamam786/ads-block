import { NextRequest, NextResponse } from 'next/server';
import { NEWS_KEYWORDS } from '@/lib/feedConfig';

const API_KEY = (process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY)
  ?.trim()
  ?.replace(/^["']|["']$/g, '');

const newsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

export async function GET(request: NextRequest) {
  const keyword =
    NEWS_KEYWORDS[Math.floor(Math.random() * NEWS_KEYWORDS.length)];
  const pageToken = request.nextUrl.searchParams.get('pageToken') || '';

  const cacheKey = `${keyword}_${pageToken}`;
  const cached = newsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // Strategy 1: Official YouTube API
  if (API_KEY) {
    try {
      const params = new URLSearchParams({
        part: 'snippet',
        q: keyword,
        type: 'video',
        order: 'date',
        maxResults: '20',
        key: API_KEY,
        ...(pageToken && { pageToken }),
      });

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params}`,
        { signal: AbortSignal.timeout(4000) }
      );

      if (response.ok) {
        const data = await response.json();
        const videos = (data.items || []).map((item: any) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          thumbnail:
            item.snippet.thumbnails.medium?.url ||
            item.snippet.thumbnails.default?.url,
          channel: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
        }));

        const result = {
          videos,
          nextPageToken: data.nextPageToken || null,
          currentKeyword: keyword,
        };

        newsCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return NextResponse.json(result);
      }
    } catch {
      // Fallback
    }
  }

  // Strategy 2: Invidious News Search Fallback (when Quota 429 occurs)
  const invidiousEndpoints = [
    `https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(keyword)}&type=video&sort_by=upload_date`,
    `https://yt.artemislena.eu/api/v1/search?q=${encodeURIComponent(keyword)}&type=video&sort_by=upload_date`,
    `https://invidious.nerdvpn.de/api/v1/search?q=${encodeURIComponent(keyword)}&type=video&sort_by=upload_date`,
  ];

  for (const endpoint of invidiousEndpoints) {
    try {
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const videos = items.slice(0, 20).map((item: any) => ({
            videoId: item.videoId,
            title: item.title,
            thumbnail:
              item.videoThumbnails?.[0]?.url ||
              `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`,
            channel: item.author || 'News Channel',
            publishedAt: new Date(item.published * 1000).toISOString(),
          }));

          const result = {
            videos,
            nextPageToken: null,
            currentKeyword: keyword,
          };

          newsCache.set(cacheKey, { data: result, timestamp: Date.now() });
          return NextResponse.json(result);
        }
      }
    } catch {
      // Try next
    }
  }

  return NextResponse.json({
    videos: [],
    nextPageToken: null,
    currentKeyword: keyword,
  });
}