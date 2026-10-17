import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

async function streamAudioResponse(url: string, request: Request) {
  const range = request.headers.get('range');
  const headers: HeadersInit = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
  if (range) {
    headers['Range'] = range;
  }

  const upstream = await fetch(url, { headers });
  if (!upstream.ok && upstream.status !== 206) {
    throw new Error(`Upstream returned ${upstream.status}`);
  }

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', upstream.headers.get('content-type') || 'audio/mp4');
  responseHeaders.set('Accept-Ranges', 'bytes');
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Cache-Control', 'public, max-age=3600');

  if (upstream.headers.get('content-range')) {
    responseHeaders.set('Content-Range', upstream.headers.get('content-range')!);
  }
  if (upstream.headers.get('content-length')) {
    responseHeaders.set('Content-Length', upstream.headers.get('content-length')!);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const type = searchParams.get('type') || 'video'; // 'audio' or 'video'

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  // Strategy 1: Fast public Piped streaming instances
  const pipedInstances = [
    `https://pipedapi.adminforge.de/streams/${videoId}`,
    `https://pipedapi.leptons.xyz/streams/${videoId}`,
    `https://api.piped.private.coffee/streams/${videoId}`,
    `https://piped-api.garudalinux.org/streams/${videoId}`,
  ];

  for (const endpoint of pipedInstances) {
    try {
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json();

        if (type === 'audio') {
          const audioStream =
            data.audioStreams?.find(
              (s: any) => s.mimeType?.includes('audio') || s.format === 'M4A'
            ) || data.audioStreams?.[0];

          if (audioStream?.url) {
            try {
              return await streamAudioResponse(audioStream.url, request);
            } catch {
              // Try direct redirect if proxy stream error
              return NextResponse.redirect(audioStream.url, { status: 307 });
            }
          }
        } else {
          const videoStream =
            data.videoStreams?.find(
              (s: any) => s.mimeType?.includes('mp4') && s.videoOnly === false
            ) ||
            data.videoStreams?.find((s: any) => s.mimeType?.includes('mp4'));

          if (videoStream?.url) {
            return NextResponse.redirect(videoStream.url, { status: 307 });
          }
        }
      }
    } catch {
      // Try next instance
    }
  }

  // Strategy 2: Invidious Instances
  const invidiousInstances = [
    `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
    `https://inv.nadeko.net/api/v1/videos/${videoId}`,
    `https://invidious.drgns.space/api/v1/videos/${videoId}`,
  ];

  for (const endpoint of invidiousInstances) {
    try {
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json();

        if (type === 'audio') {
          const audioFormat =
            data.adaptiveFormats?.find(
              (f: any) => f.type?.startsWith('audio') && !!f.url
            ) ||
            data.formatStreams?.find(
              (f: any) => f.type?.startsWith('audio') && !!f.url
            );

          if (audioFormat?.url) {
            try {
              return await streamAudioResponse(audioFormat.url, request);
            } catch {
              return NextResponse.redirect(audioFormat.url, { status: 307 });
            }
          }
        } else {
          const videoFormat =
            data.formatStreams?.find(
              (f: any) => f.type?.includes('mp4') && !!f.url
            ) ||
            data.adaptiveFormats?.find(
              (f: any) => f.type?.includes('mp4') && !!f.url
            );

          if (videoFormat?.url) {
            return NextResponse.redirect(videoFormat.url, { status: 307 });
          }
        }
      }
    } catch {
      // Try next instance
    }
  }

  // Strategy 3: ytdl-core extraction
  try {
    const info = await ytdl.getInfo(videoId, {
      requestOptions: {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    });

    let format: any = null;
    if (type === 'audio') {
      format =
        info.formats.find(
          (f: any) => f.hasAudio && !f.hasVideo && (f.container === 'mp4' || f.container === 'm4a') && !!f.url
        ) ||
        info.formats.find((f: any) => f.hasAudio && !f.hasVideo && !!f.url) ||
        info.formats.find((f: any) => f.hasAudio && !!f.url);

      if (format?.url) {
        return await streamAudioResponse(format.url, request);
      }
    } else {
      format =
        info.formats.find(
          (f: any) => f.hasVideo && f.hasAudio && f.container === 'mp4' && !!f.url
        ) ||
        info.formats.find(
          (f: any) => f.hasVideo && f.container === 'mp4' && !!f.url
        ) ||
        info.formats.find((f: any) => f.hasVideo && !!f.url);

      if (format?.url) {
        return NextResponse.redirect(format.url, { status: 307 });
      }
    }
  } catch {
    // End of options
  }

  return NextResponse.json(
    {
      error: `Direct ${type} stream unavailable for this video.`,
    },
    { status: 502 }
  );
}
