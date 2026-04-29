import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const videoId = request.nextUrl.searchParams.get('videoId');
    const userId = request.nextUrl.searchParams.get('userId');

    if (!videoId || !userId) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      );
    }

    // Query Supabase to check if user liked this video
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/likes?user_id=eq.${userId}&video_id=eq.${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      }
    );

    const likes = await response.json();

    // Get total like count for video
    const countResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/likes?video_id=eq.${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Content-Range': '0/0',
        },
      }
    );

    const countText = countResponse.headers.get('content-range');
    const likeCount = countText ? parseInt(countText.split('/')[1]) : 0;

    return NextResponse.json({
      isLiked: likes.length > 0,
      likeCount,
    });
  } catch (error) {
    console.error('Error checking like status:', error);
    return NextResponse.json(
      { error: 'Failed to check like status' },
      { status: 500 }
    );
  }
}