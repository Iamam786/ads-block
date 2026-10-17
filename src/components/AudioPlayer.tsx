"use client";
import { useEffect, useRef, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Play, Pause, Volume2, Music, Lock, Radio } from "lucide-react";

// Minimal valid silent WAV to anchor background audio on mobile lock screen
const SILENT_AUDIO_DATA =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

interface AudioPlayerProps {
  playerRef: any;
  isPlaying: boolean;
  volume: number;
  handleVolumeChange: (value: number[]) => void;
  togglePlayPause: () => void;
  currentTime: number;
  duration: number;
  handleSeek: (value: number[]) => void;
  formatTime: (seconds: number) => string;
  videoId?: string;
  videoTitle?: string;
  videoChannel?: string;
  videoThumbnail?: string;
  player?: any;
}

export default function AudioPlayer({
  playerRef,
  isPlaying,
  volume,
  handleVolumeChange,
  togglePlayPause,
  currentTime,
  duration,
  handleSeek,
  formatTime,
  videoId,
  videoTitle,
  videoChannel,
  videoThumbnail,
  player,
}: AudioPlayerProps) {
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [useNativeStream, setUseNativeStream] = useState(true);

  const displayTitle = videoTitle || "YouTube Audio Stream";
  const displayChannel = videoChannel || "Ad-Free YouTube Viewer";
  const displayThumbnail =
    videoThumbnail ||
    (videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : "/icon-192.png");

  // Synchronize native audio play/pause with isPlaying
  useEffect(() => {
    const audio = nativeAudioRef.current;
    if (!audio || !useNativeStream) return;

    if (isPlaying) {
      audio.play().catch(() => {
        // Fallback to iframe if native stream blocked
        if (player && typeof player.playVideo === "function") {
          player.playVideo();
        }
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, useNativeStream, player]);

  // Synchronize volume
  useEffect(() => {
    if (nativeAudioRef.current) {
      nativeAudioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Lock Screen MediaSession integration (Android notification bar / iOS lock screen controls)
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: displayTitle,
        artist: displayChannel,
        album: "Ad-Free Background Audio",
        artwork: [
          { src: displayThumbnail, sizes: "96x96", type: "image/jpeg" },
          { src: displayThumbnail, sizes: "128x128", type: "image/jpeg" },
          { src: displayThumbnail, sizes: "192x192", type: "image/jpeg" },
          { src: displayThumbnail, sizes: "512x512", type: "image/jpeg" },
        ],
      });

      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      navigator.mediaSession.setActionHandler("play", () => {
        togglePlayPause();
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        togglePlayPause();
      });

      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          handleSeek([details.seekTime]);
          if (nativeAudioRef.current) {
            nativeAudioRef.current.currentTime = details.seekTime;
          }
        }
      });

      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        const offset = details.seekOffset || 10;
        const target = Math.max(0, currentTime - offset);
        handleSeek([target]);
        if (nativeAudioRef.current) {
          nativeAudioRef.current.currentTime = target;
        }
      });

      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const offset = details.seekOffset || 10;
        const target = Math.min(duration, currentTime + offset);
        handleSeek([target]);
        if (nativeAudioRef.current) {
          nativeAudioRef.current.currentTime = target;
        }
      });
    } catch (e) {
      console.warn("MediaSession setup warning:", e);
    }
  }, [
    displayTitle,
    displayChannel,
    displayThumbnail,
    isPlaying,
    currentTime,
    duration,
    handleSeek,
    togglePlayPause,
  ]);

  return (
    <Card className="overflow-hidden bg-card border-border p-6 md:p-8">
      {/* Native HTML5 Audio stream - Mobile OS NEVER kills this when screen locks */}
      {videoId && useNativeStream && (
        <audio
          ref={nativeAudioRef}
          src={`/api/stream?type=audio&videoId=${videoId}`}
          playsInline
          preload="auto"
          onError={() => {
            console.warn("Native audio stream unavailable, falling back to YouTube IFrame player");
            setUseNativeStream(false);
          }}
        />
      )}

      <div className="flex flex-col items-center text-center">
        {/* Cover Art / Icon */}
        <div className="relative mb-6">
          {displayThumbnail && videoId ? (
            <div className="h-44 w-44 md:h-52 md:w-52 rounded-2xl overflow-hidden shadow-2xl border border-border group relative">
              <img
                src={displayThumbnail}
                alt={displayTitle}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Music className="h-12 w-12 text-white/80 animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="h-44 w-44 md:h-52 md:w-52 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Music className="h-20 w-20 text-primary" />
            </div>
          )}
        </div>

        <h3 className="text-xl font-bold mb-1 line-clamp-1 max-w-lg">
          {displayTitle}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
          {displayChannel}
        </p>

        {/* Lock Screen Support Indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
          <Lock className="h-3.5 w-3.5" />
          <span>Screen Lock Mode Enabled • Plays in background</span>
        </div>

        {/* Audio Controls */}
        <div className="w-full max-w-md space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Play/Pause Button */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={togglePlayPause}
              size="lg"
              className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8 ml-1" />
              )}
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
              className="flex-1 cursor-pointer"
            />
            <span className="text-sm text-muted-foreground w-12 text-right font-mono">
              {volume}%
            </span>
          </div>
        </div>

        {/* Hidden YouTube player for audio streaming */}
        <div ref={playerRef} className="hidden" />
      </div>
    </Card>
  );
}
