"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Search, Play, Download, Music, Pause, Volume2, Video, Headphones } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export default function YouTubeViewer() {
  const [videoId, setVideoId] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [audioMode, setAudioMode] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState<"video" | "audio">("video")
  const [videoQuality, setVideoQuality] = useState("720")

  const [player, setPlayer] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(70)
  const playerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const extractVideoId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const id = extractVideoId(searchInput)
    if (id) {
      setVideoId(id)
      setAudioMode(false)
      if (player) {
        player.destroy()
        setPlayer(null)
      }
    }
  }

  const handleDownloadClick = () => {
    if (!videoId) return
    setShowDownloadDialog(true)
  }

  const handleDownload = async () => {
    if (!videoId) return

    setDownloading(true)
    setShowDownloadDialog(false)

    try {
      const params = new URLSearchParams({
        videoId,
        format: downloadFormat,
        quality: downloadFormat === "video" ? videoQuality : "highest",
      })

      console.log("[v0] Requesting download with params:", Object.fromEntries(params))
      const response = await fetch(`/api/download?${params}`)
      const data = await response.json()
      console.log("[v0] Download API response:", data)

      if (data.success && data.downloadUrl) {
        if (data.fallback) {
          // If it's a fallback, open in new tab
          window.open(data.downloadUrl, "_blank")
        } else {
          // Try direct download
          const link = document.createElement("a")
          link.href = data.downloadUrl
          link.download = data.filename || `youtube-${videoId}.${downloadFormat === "audio" ? "mp3" : "mp4"}`
          link.target = "_blank"
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      } else {
        alert(data.error || "Download failed. Opening download page in new tab.")
        window.open(`https://www.y2mate.com/youtube/${videoId}`, "_blank")
      }
    } catch (error) {
      console.error("[v0] Download error:", error)
      alert("Download failed. Opening download page in new tab.")
      window.open(`https://www.y2mate.com/youtube/${videoId}`, "_blank")
    } finally {
      setDownloading(false)
    }
  }

  const toggleAudioMode = () => {
    if (!audioMode && videoId) {
      setAudioMode(true)
    } else {
      setAudioMode(false)
      if (player) {
        player.destroy()
        setPlayer(null)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }

  const togglePlayPause = () => {
    if (player) {
      if (isPlaying) {
        player.pauseVideo()
      } else {
        player.playVideo()
      }
    }
  }

  const handleSeek = (value: number[]) => {
    if (player) {
      player.seekTo(value[0], true)
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (player) {
      player.setVolume(value[0])
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const popularVideos = [
    { id: "dQw4w9WgXcQ", title: "Popular Music Video", thumbnail: "/music-video-thumbnail.png" },
    { id: "jNQXAC9IVRw", title: "Me at the zoo", thumbnail: "/first-youtube-video.jpg" },
    { id: "9bZkp7q19f0", title: "Gangnam Style", thumbnail: "/gangnam-style-inspired-thumbnail.png" },
  ]

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }
  }, [])

  useEffect(() => {
    if (audioMode && videoId && !player && window.YT) {
      const newPlayer = new window.YT.Player(playerRef.current, {
        height: "1",
        width: "1",
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume)
            event.target.playVideo()
            setIsPlaying(true)
            setDuration(event.target.getDuration())

            // Update current time
            intervalRef.current = setInterval(() => {
              if (event.target.getCurrentTime) {
                setCurrentTime(event.target.getCurrentTime())
              }
            }, 1000)
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true)
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false)
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false)
            }
          },
        },
      })
      setPlayer(newPlayer)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [audioMode, videoId])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-balance">
              <span className="text-primary">Ad-Free</span> YouTube Viewer
            </h1>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">No Ads</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="max-w-3xl mx-auto mb-12">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Paste YouTube URL or Video ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-12 h-14 text-lg bg-card border-border focus:border-primary transition-colors"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Play className="h-5 w-5 mr-2" />
              Watch
            </Button>
          </form>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Supports: youtube.com/watch?v=..., youtu.be/..., or direct video ID
          </p>
        </div>

        {/* Video Player or Audio Player */}
        {videoId ? (
          <div className="max-w-6xl mx-auto mb-12">
            {audioMode ? (
              <Card className="overflow-hidden bg-card border-border p-8">
                <div className="flex flex-col items-center">
                  <div className="h-48 w-48 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8">
                    <Music className="h-24 w-24 text-primary" />
                  </div>

                  <h3 className="text-xl font-semibold mb-2">Audio Only Mode</h3>
                  <p className="text-sm text-muted-foreground mb-8">Playing audio in background</p>

                  {/* Audio Controls */}
                  <div className="w-full max-w-md space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={1}
                        onValueChange={handleSeek}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Play/Pause Button */}
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        onClick={togglePlayPause}
                        size="lg"
                        className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90"
                      >
                        {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                      </Button>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-5 w-5 text-muted-foreground" />
                      <Slider
                        value={[volume]}
                        max={100}
                        step={1}
                        onValueChange={handleVolumeChange}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12 text-right">{volume}%</span>
                    </div>
                  </div>

                  {/* Hidden YouTube player for audio */}
                  <div ref={playerRef} className="hidden" />
                </div>
              </Card>
            ) : (
              <Card className="overflow-hidden bg-card border-border">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </Card>
            )}

            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Ad-free playback enabled
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="text-sm text-muted-foreground">Video ID: {videoId}</div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={toggleAudioMode}
                  variant={audioMode ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                >
                  <Music className="h-4 w-4" />
                  {audioMode ? "Video Mode" : "Audio Only"}
                </Button>
                <Button
                  onClick={handleDownloadClick}
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                  disabled={downloading}
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Downloading..." : "Download"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto mb-12">
            <Card className="bg-card border-border border-dashed">
              <div className="flex flex-col items-center justify-center py-24 px-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Play className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-2 text-balance text-center">No video selected</h2>
                <p className="text-muted-foreground text-center max-w-md text-balance">
                  Paste a YouTube URL above to start watching videos without ads
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Popular Videos */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-semibold mb-6 text-foreground">Try these videos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {popularVideos.map((video) => (
              <Card
                key={video.id}
                className="overflow-hidden bg-card border-border hover:border-primary transition-all cursor-pointer group"
                onClick={() => {
                  setVideoId(video.id)
                  setSearchInput(video.id)
                  setAudioMode(false)
                  if (player) {
                    player.destroy()
                    setPlayer(null)
                  }
                }}
              >
                <div className="relative aspect-video bg-muted">
                  <img
                    src={video.thumbnail || "/placeholder.svg"}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
                      <Play className="h-6 w-6 text-primary-foreground ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {video.title}
                  </h3>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="max-w-6xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-card border-border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <h3 className="font-semibold mb-2 text-foreground">No Ads</h3>
            <p className="text-sm text-muted-foreground text-balance">
              Watch videos without any interruptions or advertisements
            </p>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2 text-foreground">Fast Loading</h3>
            <p className="text-sm text-muted-foreground text-balance">
              Optimized embed player for quick video loading and playback
            </p>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="font-semibold mb-2 text-foreground">Privacy Focused</h3>
            <p className="text-sm text-muted-foreground text-balance">
              Uses youtube-nocookie.com for enhanced privacy protection
            </p>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-muted-foreground">
            Ad-free YouTube viewer • Built for distraction-free watching
          </p>
        </div>
      </footer>

      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download Options</DialogTitle>
            <DialogDescription>Choose format and quality for your download</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Format</Label>
              <RadioGroup value={downloadFormat} onValueChange={(value: any) => setDownloadFormat(value)}>
                <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="video" id="video" />
                  <Label htmlFor="video" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Video className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Video</div>
                      <div className="text-sm text-muted-foreground">Download with video and audio</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="audio" id="audio" />
                  <Label htmlFor="audio" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Headphones className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Audio Only</div>
                      <div className="text-sm text-muted-foreground">Download audio only (MP3)</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Quality Selection (only for video) */}
            {downloadFormat === "video" && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Video Quality</Label>
                <RadioGroup value={videoQuality} onValueChange={setVideoQuality}>
                  <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="highest" id="highest" />
                    <Label htmlFor="highest" className="cursor-pointer flex-1">
                      <div className="font-medium">Highest Available</div>
                      <div className="text-sm text-muted-foreground">Best quality (larger file)</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="1080" id="1080" />
                    <Label htmlFor="1080" className="cursor-pointer flex-1">
                      1080p (Full HD)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="720" id="720" />
                    <Label htmlFor="720" className="cursor-pointer flex-1">
                      720p (HD)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="480" id="480" />
                    <Label htmlFor="480" className="cursor-pointer flex-1">
                      480p (SD)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="360" id="360" />
                    <Label htmlFor="360" className="cursor-pointer flex-1">
                      360p (Low)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowDownloadDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleDownload} disabled={downloading} className="flex-1">
              {downloading ? "Downloading..." : "Download"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
