"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  Play,
  Download,
  Music,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  Info,
  SearchIcon,
  LogOutIcon,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import Footer from "../components/Footer";
import Features from "../components/Features";
import PopularVideos from "../components/PopularVideos";
import AudioPlayer from "../components/AudioPlayer";
import VideoPlayer from "../components/VideoPlayer";
import SearchResults from "../components/SearchResults";
import { FeedModeToggle } from "../components/FeedModeToggle";
import { LikeButton } from "../components/LikeButton";
import { useFeedMode } from "../hooks/useFeedMode";
import { useHumanBlur } from "../hooks/useHumanBlur";
import { useFaceBlur } from "../hooks/useFaceBlur";
import type { FeedMode } from "../lib/feedConfig";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import SearchSuggestions from "../components/SearchSuggestions";

import { useSession, signIn, signOut } from "next-auth/react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubeViewer() {
  const { data: session, status } = useSession();
  const isLoadingSession = status === "loading";

  // ========================
  // EXISTING STATE
  // ========================
  const [videoId, setVideoId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [audioMode, setAudioMode] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<"video" | "audio">(
    "video",
  );
  const [videoQuality, setVideoQuality] = useState("720");

  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRefForBlur = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [currentVideoInfo, setCurrentVideoInfo] = useState<{
    videoId: string;
    title?: string;
    channel?: string;
    thumbnail?: string;
  } | null>(null);
  const [blurStreamError, setBlurStreamError] = useState<string | null>(null);

  // ========================
  // NEW STATE - FEATURE 2 (Feed Mode)
  // ========================
  const {
    mode: feedMode,
    updateMode: updateFeedMode,
    isHydrated,
  } = useFeedMode();

  // If user is not logged in and in 'recommended' mode, switch default to 'news'
  useEffect(() => {
    if (isHydrated && !session && feedMode === "recommended") {
      updateFeedMode("news");
    }
  }, [isHydrated, session, feedMode, updateFeedMode]);

  // ========================
  // NEW STATE - FEATURE 3 (Human Blur)
  // ========================
  const {
    isEnabled: blurEnabled,
    isLoading: blurLoading,
    enableBlur,
    disableBlur,
    canvasRef: humanBlurCanvasRef,
  } = useHumanBlur(videoRefForBlur);

  const {
    isEnabled: faceBlurEnabled,
    isSupported: isFaceDetectorSupported,
    isLoading: faceBlurLoading,
    enableBlur: enableFaceBlur,
    disableBlur: disableFaceBlur,
    canvasRef: faceBlurCanvasRef,
  } = useFaceBlur(videoRefForBlur);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // ========================
  // EXISTING FUNCTIONS
  // ========================
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
        // Ignore
      }
    },
    [],
  );

  const extractVideoId = (url: string) => {
    const playlistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (playlistMatch) {
      return { type: "playlist", id: playlistMatch[1] };
    }

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);

    if (!searchInput.trim()) return;

    const result = extractVideoId(searchInput);
    if (result) {
      setVideoId(result.id);
      setCurrentVideoInfo({
        videoId: result.id,
        title: "YouTube Video",
        channel: "Ad-Free Player",
        thumbnail: `https://img.youtube.com/vi/${result.id}/hqdefault.jpg`,
      });
      setIsPlaylist(result.type === "playlist");
      setAudioMode(false);
      if (player) player.destroy();
      setSearchInput(""); // Clear search input after navigating to direct video
    } else {
      // For text queries, update the main feed area
      setActiveSearchQuery(searchInput);
      setSearchTrigger((prev) => prev + 1);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setSearchInput(suggestion);
    setShowSuggestions(false);

    const result = extractVideoId(suggestion);
    if (result) {
      setVideoId(result.id);
      setCurrentVideoInfo({
        videoId: result.id,
        title: "YouTube Video",
        channel: "Ad-Free Player",
        thumbnail: `https://img.youtube.com/vi/${result.id}/hqdefault.jpg`,
      });
      setIsPlaylist(result.type === "playlist");
      setAudioMode(false);
      if (player) player.destroy();
      setSearchInput("");
    } else {
      setActiveSearchQuery(suggestion);
      setSearchTrigger((prev) => prev + 1);
    }
  };

  const handleSelectFromSearch = (videoId: string, title?: string, channel?: string, thumbnail?: string) => {
    setVideoId(videoId);
    setCurrentVideoInfo({
      videoId,
      title: title || "YouTube Video",
      channel: channel || "Ad-Free Player",
      thumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    });
    setSearchInput("");
    setAudioMode(false);
    if (player) player.destroy();
    setIsPlaylist(false);
    setShowSuggestions(false);
  };

  const handleDownloadClick = () => {
    if (!videoId) return;
  };

  const handleDownload = async () => {
    if (!videoId) return;

    setDownloading(true);

    try {
      const params = new URLSearchParams({
        videoId,
        format: downloadFormat,
        quality: downloadFormat === "video" ? videoQuality : "highest",
      });

      const response = await fetch(`/api/download?${params}`);
      const data = await response.json();

      if (data.success && data.downloadUrl) {
        if (data.fallback) {
          window.open(data.downloadUrl, "_blank");
        } else {
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
        alert(data.error || "Download failed");
        window.open(`https://www.y2mate.com/youtube/${videoId}`, "_blank");
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("Download failed");
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

  // ========================
  // NEW FUNCTION - FEATURE 3 (Human Blur Toggle)
  // ========================
  const toggleBlur = async () => {
    if (blurEnabled) {
      disableBlur();
      setIsStreaming(false);
    } else {
      disableFaceBlur();
      setIsStreaming(true);
      await enableBlur();
    }
  };

  const toggleFaceBlur = async () => {
    if (faceBlurEnabled) {
      disableFaceBlur();
      setIsStreaming(false);
    } else {
      disableBlur();
      setIsStreaming(true);
      await enableFaceBlur();
    }
  };

  useEffect(() => {
    if (isStreaming && videoId) {
      setStreamUrl(`/api/stream?videoId=${videoId}`);
    } else {
      setStreamUrl(null);
    }
  }, [isStreaming, videoId]);

  useEffect(() => {
    if (streamUrl && videoRefForBlur.current) {
      videoRefForBlur.current.src = streamUrl;
      videoRefForBlur.current.play().catch(console.error);
    }
  }, [streamUrl]);

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

  // ========================
  // EFFECTS
  // ========================
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
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

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto sm:px-4 py-4 ">
          <div className="flex md:gap-8 gap-0.5 items-center justify-between">
            <h1 className="md:text-2xl font-bold shrink-0">
              <span className="text-primary">Ad-Free</span>{" "}
              <span className="max-md:hidden"> YouTube Viewer</span>
            </h1>

            {/* ========================   SEARCH SECTION   ======================== */}
            <div className="flex-1 max-w-2xl sm:mx-2">
              <form onSubmit={handleSearch} className="flex sm:gap-3 relative">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search YouTube or paste URL/Video ID..."
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="pl-12 focus:outline-none h-12 md:h-14 text-sm md:text-base bg-card border-gray-800 border rounded-full pr-14"
                  />
                  <SearchSuggestions
                    query={searchInput}
                    isVisible={showSuggestions}
                    onSelectSuggestion={handleSelectSuggestion}
                    onClose={() => setShowSuggestions(false)}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 md:h-14 absolute right-0 rounded-r-full border border-l-gray-400 px-5 md:px-7 bg-card hover:bg-primary/90 text-primary-foreground cursor-pointer"
                >
                  <SearchIcon className="h-5 w-5" />
                </Button>
              </form>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {session?.user ? (
                <>
                  <div className="flex items-center sm:gap-2 max-md:hidden">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {session.user.email}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => signOut()}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                   <span className="max-md:hidden">Sign Out</span><LogOutIcon/>
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => signIn("google")}
                  size="sm"
                  className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4"
                >
                  Sign in with Google
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {/* We removed SearchResults modal to show results in the feed area instead */}

        {/* ========================
            VIDEO PLAYER SECTION
            ======================== */}
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
                videoId={videoId}
                videoTitle={currentVideoInfo?.title}
                videoChannel={currentVideoInfo?.channel}
                videoThumbnail={currentVideoInfo?.thumbnail}
                player={player}
              />
            ) : (
              <>
                {/* FEATURE 3: Human Blur Toggle */}
                {!audioMode && (
                  <div className="mb-4 flex flex-col md:flex-row items-start md:items-center gap-4 bg-card border border-border rounded-lg p-4">
                    <div className="flex gap-2">
                      <Button
                        onClick={toggleBlur}
                        disabled={blurLoading || faceBlurLoading}
                        variant={blurEnabled ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                      >
                        {blurLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : blurEnabled ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                        Human Blur
                      </Button>

                      <Button
                        onClick={toggleFaceBlur}
                        disabled={
                          blurLoading ||
                          faceBlurLoading ||
                          !isFaceDetectorSupported
                        }
                        variant={faceBlurEnabled ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                      >
                        {faceBlurLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : faceBlurEnabled ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                        Face Blur (AI)
                      </Button>
                    </div>

                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        {blurEnabled &&
                          "🔍 TensorFlow is blurring detected humans"}
                        {faceBlurEnabled &&
                          "👤 FaceDetector API is blurring detected faces"}
                        {!blurEnabled &&
                          !faceBlurEnabled &&
                          "✨ Select a mode to blur content"}
                      </p>
                      {!isFaceDetectorSupported && (
                        <p className="text-[10px] text-orange-500">
                          ⚠️ FaceDetector API is not supported in this browser
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Processing Note */}
                {!audioMode && (blurEnabled || faceBlurEnabled) && (
                  <Alert className="mb-4 bg-primary/5 border-primary/20">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      AI is actively processing the secure video stream to
                      detect and blur content in real-time.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Video Player */}
                <div className="relative">
                  {isStreaming ? (
                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-border">
                      <video
                        ref={videoRefForBlur}
                        className="w-full h-full object-contain"
                        playsInline
                        controls
                        crossOrigin="anonymous"
                        onError={() => {
                          setBlurStreamError(
                            "Direct video stream is unavailable for this video (YouTube restricted raw stream). Reverting to standard ad-free player."
                          );
                          disableBlur();
                          disableFaceBlur();
                          setIsStreaming(false);
                        }}
                      />
                      {/* Blur Canvas Overlay for both Human and Face Blur */}
                      <canvas
                        ref={blurEnabled ? humanBlurCanvasRef : faceBlurCanvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none z-10"
                      />
                    </div>
                  ) : (
                    <VideoPlayer
                      videoId={videoId}
                      isPlaylist={isPlaylist}
                      title={currentVideoInfo?.title}
                      channel={currentVideoInfo?.channel}
                      thumbnail={currentVideoInfo?.thumbnail}
                    />
                  )}
                </div>
              </>
            )}

            {/* ========================
                INFO & CONTROLS SECTION
                ======================== */}
            <div className="mt-6 flex flex-col gap-4">
              {/* Top Row: Info and Controls */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Ad-free playback ✅
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="text-sm text-muted-foreground">
                    Video ID: {videoId}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* FEATURE 5: Like Button */}
                  <LikeButton videoId={videoId} showCount={true} />

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
                  🔎 Search YouTube or paste a link to start watching ads-free
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* ========================
            FEATURE 2: Popular Videos with Feed Mode Toggle
            ======================== */}
        {isHydrated && (
          <div className="max-w-6xl mx-auto mb-12">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">
                  {activeSearchQuery
                    ? `🔍 Results for "${activeSearchQuery}"`
                    : feedMode === "news"
                      ? "📰 Latest News Videos"
                      : "📺 Subscribed Feed"}
                </h2>

                {/* Feed Mode Toggle */}
                <FeedModeToggle
                  currentMode={feedMode as FeedMode}
                  onModeChange={(mode) => {
                    updateFeedMode(mode as FeedMode);
                    setActiveSearchQuery(""); // Clear search when switching modes
                  }}
                />
              </div>

              {/* Popular Videos Component (now also Search Results) */}
              <PopularVideos
                setVideoId={setVideoId}
                setSearchInput={setSearchInput}
                setAudioMode={setAudioMode}
                player={player}
                setIsPlaylist={setIsPlaylist}
                feedMode={feedMode}
                searchQuery={activeSearchQuery}
              />
            </div>
          </div>
        )}

        <Features />
      </main>

      <Footer />

      {/* Hidden elements for blur processing */}
      <div ref={containerRef} className="hidden" />
      <video ref={videoRefForBlur} className="hidden" />
    </div>
  );
}
