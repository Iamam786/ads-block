import { NextRequest, NextResponse } from 'next/server';
import { NEWS_KEYWORDS } from '@/lib/feedConfig';

const API_KEY = (process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY)
  ?.trim()
  ?.replace(/^["']|["']$/g, ''); // Remove leading/trailing quotes

export async function GET(request: NextRequest) {
  try {
    const keyword =
      NEWS_KEYWORDS[Math.floor(Math.random() * NEWS_KEYWORDS.length)];
    const pageToken = request.nextUrl.searchParams.get('pageToken') || '';

    if (!API_KEY) {
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    const params = new URLSearchParams({
      part: 'snippet',
      q: keyword,
      type: 'video',
      order: 'date', // Sort by publish date (latest first)
      maxResults: '20',
      key: API_KEY,
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { next: { revalidate: 600 } } // Cache for 10 minutes to save quota
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Failed to fetch news videos';
      console.error('News API error details:', errorData);
      return NextResponse.json(
        { error: errorMessage, details: errorData.error },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.items) {
      return NextResponse.json({
        videos: [],
        nextPageToken: null,
      });
    }

    const videos = data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail:
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url,
      channel: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));

    return NextResponse.json({
      videos,
      nextPageToken: data.nextPageToken || null,
      currentKeyword: keyword,
    });
  } catch (error) {
    console.error('News search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}