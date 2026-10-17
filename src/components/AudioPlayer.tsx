"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Play, Pause, Volume2, Music, Lock, Radio } from "lucide-react";

// Generate a valid 3-second silent PCM WAV Blob URL to maintain Android Audio Focus
function createSilentAudioBlobUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    const sampleRate = 8000;
    const durationSec = 3;
    const numSamples = durationSec * sampleRate;
    const buffer = new ArrayBuffer(44 + numSamples);
    const view = new DataView(buffer);

    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, numSamples, true);

    new Uint8Array(buffer, 44).fill(128);

    const blob = new Blob([buffer], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}

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
  const silentAnchorRef = useRef<HTMLAudioElement | null>(null);
  const [useNativeStream, setUseNativeStream] = useState(true);
  const [silentAudioUrl, setSilentAudioUrl] = useState("");

  const displayTitle = videoTitle || "YouTube Audio Stream";
  const displayChannel = videoChannel || "Ad-Free YouTube Viewer";
  const displayThumbnail =
    videoThumbnail ||
    (videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : "/icon-192.png");

  useEffect(() => {
    const url = createSilentAudioBlobUrl();
    setSilentAudioUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  // Synchronize audio play/pause with isPlaying
  useEffect(() => {
    const audio = nativeAudioRef.current;
    const anchor = silentAnchorRef.current;

    if (isPlaying) {
      anchor?.play().catch(() => {});
      if (audio && useNativeStream) {
        audio.play().catch(() => {
          // If native stream fails, fallback to YouTube player
          if (player && typeof player.playVideo === "function") {
            player.playVideo();
          }
        });
      } else if (player && typeof player.playVideo === "function") {
        player.playVideo();
      }
    } else {
      anchor?.pause();
      if (audio) {
        audio.pause();
      }
      if (player && typeof player.pauseVideo === "function") {
        player.pauseVideo();
      }
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
        silentAnchorRef.current?.play().catch(() => {});
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
      {/* Background audio anchor element to keep mobile audio focus permanently pinned in Android shade */}
      {silentAudioUrl && (
        <audio
          ref={silentAnchorRef}
          src={silentAudioUrl}
          loop
          playsInline
          preload="auto"
        />
      )}

      {/* Native HTML5 Audio stream - Mobile OS NEVER kills this when screen locks */}
      {videoId && useNativeStream && (
        <audio
          ref={nativeAudioRef}
          src={`/api/stream?type=audio&videoId=${videoId}`}
          playsInline
          preload="auto"
          onError={() => {
            console.warn("Native audio stream unavailable, switching to player stream");
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium mb-6">
          <Lock className="h-3.5 w-3.5" />
          <span>Screen Lock Mode Active • Plays continuously in background</span>
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
