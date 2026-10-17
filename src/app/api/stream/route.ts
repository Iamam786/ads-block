import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  // Strategy 1: Attempt ytdl-core with combined audio/video MP4 formats
  try {
    const info = await ytdl.getInfo(videoId, {
      requestOptions: {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    });

    let format = info.formats.find(
      (f: any) => f.hasVideo && f.hasAudio && f.container === 'mp4' && !!f.url
    );

    if (!format) {
      format = info.formats.find(
        (f: any) => f.hasVideo && f.container === 'mp4' && !!f.url
      );
    }

    if (!format) {
      format = info.formats.find((f: any) => f.hasVideo && !!f.url);
    }

    if (format && format.url) {
      const response = await fetch(format.url);
      if (response.ok && response.body) {
        return new Response(response.body, {
          headers: {
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          },
        });
      }
    }
  } catch (ytdlError) {
    console.warn('ytdl-core extraction attempt failed:', ytdlError);
  }

  // Strategy 2: Fallback to public streaming proxy instances
  const streamInstances = [
    `https://pipedapi.kavin.rocks/streams/${videoId}`,
    `https://api.piped.private.coffee/streams/${videoId}`,
    `https://piped-api.lunar.icu/streams/${videoId}`,
  ];

  for (const endpoint of streamInstances) {
    try {
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        const videoStream =
          data.videoStreams?.find(
            (s: any) => s.mimeType?.includes('mp4') && s.videoOnly === false
          ) ||
          data.videoStreams?.find((s: any) => s.mimeType?.includes('mp4'));

        if (videoStream?.url) {
          const proxiedRes = await fetch(videoStream.url);
          if (proxiedRes.ok && proxiedRes.body) {
            return new Response(proxiedRes.body, {
              headers: {
                'Content-Type': 'video/mp4',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
              },
            });
          }
        }
      }
    } catch {
      // Continue to next instance
    }
  }

  return NextResponse.json(
    {
      error:
        'Direct video stream unavailable. YouTube restricted direct streaming for this video.',
    },
    { status: 502 }
  );
}
