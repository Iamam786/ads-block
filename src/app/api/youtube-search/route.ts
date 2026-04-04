import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const pageToken = searchParams.get('pageToken');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const params = new URLSearchParams({
        part: 'snippet',
        q: query,
        key: YOUTUBE_API_KEY,
        type: 'video',
        maxResults: '10',
        pageToken: pageToken || '',
    });

    try {
        const response = await fetch(`${YOUTUBE_API_URL}?${params.toString()}`);
        const data = await response.json();

        const videos = data.items.map(video => ({
            title: video.snippet.title,
            thumbnail: video.snippet.thumbnails.default.url,
            channel: video.snippet.channelTitle,
            duration: video.contentDetails?.duration || 'N/A',
        }));

        return NextResponse.json({
            videos,
            nextPageToken: data.nextPageToken || null,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch data from YouTube API' }, { status: 500 });
    }
}