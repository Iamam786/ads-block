import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const videoId = searchParams.get("videoId")
  const format = searchParams.get("format") || "video"
  const quality = searchParams.get("quality") || "highest"

  if (!videoId) {
    return NextResponse.json({ success: false, error: "Video ID is required" }, { status: 400 })
  }

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    // Use a reliable external API service for YouTube downloads
    // Using loader.to API which is more stable
    const apiUrl = "https://loader.to/ajax/download.php"

    const formData = new URLSearchParams()
    formData.append("url", videoUrl)

    if (format === "audio") {
      formData.append("format", "mp3")
      formData.append("quality", "128")
    } else {
      formData.append("format", "mp4")
      // Map quality to loader.to format
      const qualityMap: Record<string, string> = {
        "1080": "1080",
        "720": "720",
        "480": "480",
        "360": "360",
        highest: "1080",
      }
      formData.append("quality", qualityMap[quality] || "720")
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    })

    const data = await response.json()

    if (data.success && data.download) {
      return NextResponse.json({
        success: true,
        downloadUrl: data.download,
        filename: data.title || `youtube-${videoId}.${format === "audio" ? "mp3" : "mp4"}`,
        title: data.title || "YouTube Video",
      })
    }

    // Fallback: Return direct YouTube URL with instructions
    return NextResponse.json({
      success: true,
      downloadUrl: `https://www.y2mate.com/youtube/${videoId}`,
      filename: `youtube-${videoId}.${format === "audio" ? "mp3" : "mp4"}`,
      title: "YouTube Video",
      fallback: true,
    })
  } catch (error: any) {
    console.error("[v0] Download API error:", error)

    // Return fallback download page URL
    return NextResponse.json({
      success: true,
      downloadUrl: `https://www.y2mate.com/youtube/${videoId}`,
      filename: `youtube-${videoId}.${format === "audio" ? "mp3" : "mp4"}`,
      title: "YouTube Video",
      fallback: true,
    })
  }
}
