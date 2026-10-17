import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session: any = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Step 1: Fetch subscriptions to get channel IDs
    const subsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=15`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    const subsData = await subsResponse.json();

    if (subsData.error) {
       console.error("Subs Error:", subsData.error);
       return NextResponse.json({ error: subsData.error.message }, { status: subsData.error.code });
    }

    const channelIds = subsData.items?.map((item: any) => item.snippet.resourceId.channelId) || [];

    if (channelIds.length === 0) {
      console.log("No subscriptions found for this user.");
      return NextResponse.json({ videos: [] });
    }

    // Step 2: Fetch latest videos for these channels
    // Since we want to be efficient, we'll fetch the most recent videos from these channels
    // We'll use the search API with the channelId filter for the first few channels
    // Note: To avoid rate limits, we'll combine results
    
    let allVideos: any[] = [];
    
    // We'll fetch from the first 5 channels to keep it fast
    const channelsToFetch = channelIds.slice(0, 8);
    
    const videoPromises = channelsToFetch.map(async (channelId: string) => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=3&order=date&type=video&key=${process.env.YOUTUBE_API_KEY}`
        );
        const data = await res.json();
        return data.items || [];
      } catch (e) {
        return [];
      }
    });

    const results = await Promise.all(videoPromises);
    
    results.forEach((items: any) => {
      items.forEach((item: any) => {
        allVideos.push({
          videoId: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
          channel: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
        });
      });
    });

    // Sort by date (newest first)
    allVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    console.log(`Successfully fetched ${allVideos.length} videos from subscriptions.`);
    
    return NextResponse.json({ videos: allVideos });

  } catch (error: any) {
    console.error("YouTube Subscriptions Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
