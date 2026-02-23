"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  Play,
  Download,
  Music,
  Pause,
  Volume2,
  Video,
  Headphones,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import Footer from "../components/Footer";
import Features from "../components/Features";
import PopularVideos from "../components/PopularVideos";
import Header from "../components/Header";
import AudioPlayer from "../components/AudioPlayer";
import VideoPlayer from "../components/VideoPlayer";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubeViewer() {
  const [videoId, setVideoId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [audioMode, setAudioMode] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<"video" | "audio">(
    "video"
  );
  const [videoQuality, setVideoQuality] = useState("720");

  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const playerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaylist, setIsPlaylist] = useState(false);

  const lockOrientation = useCallback(
    async (mode: "portrait" | "landscape") => {
      if (typeof window === "undefined") return;

      const orientationApi = screen.orientation as
        | (ScreenOrientation & {
            lock?: (orientation: "portrait" | "landscape") => Promise<void>;
          })
        | undefined;

      if (!orientationApi || typeof orientationApi.lock !== "function") return;

      try {
        await orientationApi.lock(mode);
      } catch {
        // Ignore unsupported orientation lock failures.
      }
    },
    []
  );

  const extractVideoId = (url: string) => {
    // 🎯 First check for Playlist
    const playlistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (playlistMatch) {
      return { type: "playlist", id: playlistMatch[1] };
    }

    // 🎥 Otherwise normal video
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return { type: "video", id: match[1] };
    }
    return null;
  };

  // ✅ handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const result = extractVideoId(searchInput);
    if (!result) return;

    setVideoId(result.id);
    setIsPlaylist(result.type === "playlist");
    setAudioMode(false);
    if (player) player.destroy();
  };

  const handleDownloadClick = () => {
    if (!videoId) return;
    setShowDownloadDialog(true);
  };

  const handleDownload = async () => {
    if (!videoId) return;

    setDownloading(true);
    setShowDownloadDialog(false);

    try {
      const params = new URLSearchParams({
        videoId,
        format: downloadFormat,
        quality: downloadFormat === "video" ? videoQuality : "highest",
      });

      console.log(
        "[v0] Requesting download with params:",
        Object.fromEntries(params)
      );
      const response = await fetch(`/api/download?${params}`);
      const data = await response.json();
      console.log("[v0] Download API response:", data);

      if (data.success && data.downloadUrl) {
        if (data.fallback) {
          // If it's a fallback, open in new tab
          window.open(data.downloadUrl, "_blank");
        } else {
          // Try direct download
          const link = document.createElement("a");
          link.href = data.downloadUrl;
          link.download =
            data.filename ||
            `youtube-${videoId}.${downloadFormat === "audio" ? "mp3" : "mp4"}`;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        alert(
          data.error || "Download failed. Opening download page in new tab."
        );
        window.open(`https://www.y2mate.com/youtube/${videoId}`, "_blank");
      }
    } catch (error) {
      console.error("[v0] Download error:", error);
      alert("Download failed. Opening download page in new tab.");
      window.open(`https://www.y2mate.com/youtube/${videoId}`, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  const toggleAudioMode = () => {
    if (!audioMode && videoId) {
      setAudioMode(true);
    } else {
      setAudioMode(false);
      if (player) {
        player.destroy();
        setPlayer(null);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const togglePlayPause = () => {
    if (player) {
      if (isPlaying) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (player) {
      player.seekTo(value[0], true);
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (player) {
      player.setVolume(value[0]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const popularVideos = [
    {
      id: "dQw4w9WgXcQ",
      title: "Popular Music Video",
      thumbnail: "/music-video-thumbnail.png",
    },
    {
      id: "jNQXAC9IVRw",
      title: "Me at the zoo",
      thumbnail: "/first-youtube-video.jpg",
    },
    {
      id: "9bZkp7q19f0",
      title: "Gangnam Style",
      thumbnail: "/gangnam-style-inspired-thumbnail.png",
    },
  ];

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    // Keep app portrait by default. Allow landscape only in fullscreen.
    void lockOrientation("portrait");

    const onFullscreenChange = () => {
      const fullscreenActive = Boolean(document.fullscreenElement);
      void lockOrientation(fullscreenActive ? "landscape" : "portrait");
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [lockOrientation]);

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
            event.target.setVolume(volume);
            event.target.playVideo();
            setIsPlaying(true);
            setDuration(event.target.getDuration());

            // Update current time
            intervalRef.current = setInterval(() => {
              if (event.target.getCurrentTime) {
                setCurrentTime(event.target.getCurrentTime());
              }
            }, 1000);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
            }
          },
        },
      });
      setPlayer(newPlayer);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [audioMode, videoId]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

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
              <AudioPlayer
                playerRef={playerRef}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                handleSeek={handleSeek}
                handleVolumeChange={handleVolumeChange}
                togglePlayPause={togglePlayPause}
                formatTime={formatTime}
              />
            ) : (
              // <VideoPlayer {...{ videoId, setVideoId, setSearchInput, setAudioMode, player }} />
              <VideoPlayer
                {...{
                  videoId,
                  isPlaylist,
                  setVideoId,
                  setSearchInput,
                  setAudioMode,
                  player,
                }}
              />
            )}

            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Ad-free playback enabled
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="text-sm text-muted-foreground">
                  Video ID: {videoId}
                </div>
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
                <h2 className="text-2xl font-semibold mb-2 text-balance text-center">
                  No video selected
                </h2>
                <p className="text-muted-foreground text-center max-w-md text-balance">
                  Paste a YouTube URL above to start watching videos without ads
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Popular Videos */}
        <PopularVideos
          setVideoId={setVideoId}
          setSearchInput={setSearchInput}
          setAudioMode={setAudioMode}
          player={player}
          setIsPlaylist={setIsPlaylist}
        />

        {/* Features */}
        <Features />
      </main>

      {/* Footer */}
      <Footer />

      {/* Download Dialog */}
    </div>
  );
}
