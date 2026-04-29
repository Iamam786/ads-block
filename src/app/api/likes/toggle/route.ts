import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { videoId, userId, isLiked } = await request.json();

    if (!videoId || !userId) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      );
    }

    if (isLiked) {
      // Unlike - delete the record
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/likes?user_id=eq.${userId}&video_id=eq.${videoId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        }
      );
    } else {
      // Like - insert new record
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/likes`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            video_id: videoId,
          }),
        }
      );
    }

    // Get updated like count
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
      isLiked: !isLiked,
      likeCount,
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}