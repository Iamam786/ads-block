import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const type = searchParams.get('type') || 'video'; // 'audio' or 'video'
  const wantJson = searchParams.get('format') === 'json';

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  // Strategy 1: Attempt ytdl-core extraction
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
    } else {
      format =
        info.formats.find(
          (f: any) => f.hasVideo && f.hasAudio && f.container === 'mp4' && !!f.url
        ) ||
        info.formats.find(
          (f: any) => f.hasVideo && f.container === 'mp4' && !!f.url
        ) ||
        info.formats.find((f: any) => f.hasVideo && !!f.url);
    }

    if (format && format.url) {
      if (wantJson) {
        return NextResponse.json({ url: format.url });
      }
      return NextResponse.redirect(format.url, { status: 307 });
    }
  } catch {
    // Continue to public streaming endpoints
  }

  // Strategy 2: Fallback to fast public Piped instances
  const pipedInstances = [
    `https://pipedapi.adminforge.de/streams/${videoId}`,
    `https://pipedapi.leptons.xyz/streams/${videoId}`,
    `https://api.piped.private.coffee/streams/${videoId}`,
    `https://piped-api.garudalinux.org/streams/${videoId}`,
    `https://api-piped.mha.fi/streams/${videoId}`,
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
            if (wantJson) {
              return NextResponse.json({ url: audioStream.url });
            }
            return NextResponse.redirect(audioStream.url, { status: 307 });
          }
        } else {
          const videoStream =
            data.videoStreams?.find(
              (s: any) => s.mimeType?.includes('mp4') && s.videoOnly === false
            ) ||
            data.videoStreams?.find((s: any) => s.mimeType?.includes('mp4'));

          if (videoStream?.url) {
            if (wantJson) {
              return NextResponse.json({ url: videoStream.url });
            }
            return NextResponse.redirect(videoStream.url, { status: 307 });
          }
        }
      }
    } catch {
      // Continue to next instance
    }
  }

  // Strategy 3: Fallback to Invidious instances
  const invidiousInstances = [
    `https://inv.nadeko.net/api/v1/videos/${videoId}`,
    `https://yt.artemislena.eu/api/v1/videos/${videoId}`,
    `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
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
            if (wantJson) {
              return NextResponse.json({ url: audioFormat.url });
            }
            return NextResponse.redirect(audioFormat.url, { status: 307 });
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
            if (wantJson) {
              return NextResponse.json({ url: videoFormat.url });
            }
            return NextResponse.redirect(videoFormat.url, { status: 307 });
          }
        }
      }
    } catch {
      // Continue to next instance
    }
  }

  return NextResponse.json(
    {
      error: `Direct ${type} stream unavailable. YouTube restricted direct streaming for this item.`,
    },
    { status: 502 }
  );
}
