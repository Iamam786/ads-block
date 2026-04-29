import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(videoId);
    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'highestvideo',
      filter: (format) => format.container === 'mp4' && !!format.url
    });

    if (!format) {
      return NextResponse.json({ error: 'No suitable format found' }, { status: 404 });
    }

    // Proxy the stream to avoid CORS issues
    const response = await fetch(format.url);
    const stream = response.body;

    return new Response(stream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error streaming video:', error);
    return NextResponse.json({ error: 'Failed to stream video' }, { status: 500 });
  }
}
