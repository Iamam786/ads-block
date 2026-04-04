import { NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const pageToken = searchParams.get('pageToken');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    if (!YOUTUBE_API_KEY) {
        return NextResponse.json({ error: 'YOUTUBE_API_KEY is not configured' }, { status: 500 });
    }

    const params = new URLSearchParams({
        part: 'snippet',
        q: query,
        key: YOUTUBE_API_KEY,
        type: 'video',
        maxResults: '10',
        ...(pageToken && { pageToken }),
    });

    try {
        const response = await fetch(`${YOUTUBE_API_URL}?${params.toString()}`);
        
        if (!response.ok) {
            return NextResponse.json({ error: 'YouTube API error' }, { status: response.status });
        }

        const data = await response.json();

   const videos = (data.items || []).map((video: any) => ({
    videoId: video.id.videoId,  // ✅ Changed from 'id' to 'videoId'
    title: video.snippet.title,
    thumbnail: video.snippet.thumbnails.medium.url,  // ✅ Changed from 'default' to 'medium'
    channel: video.snippet.channelTitle,
}));

        return NextResponse.json({
            videos,
            nextPageToken: data.nextPageToken || null,
        });
    } catch (error) {
        console.error('YouTube API error:', error);
        return NextResponse.json({ error: 'Failed to fetch data from YouTube API' }, { status: 500 });
    }
}
