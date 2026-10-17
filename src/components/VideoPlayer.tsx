"use client";

import { Card } from "../components/ui/card";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePinchZoom } from "../hooks/usePinchZoom";
import { ZoomIn, Lock, Music } from "lucide-react";

const SILENT_AUDIO_DATA =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

interface VideoPlayerProps {
  videoId: string;
  isPlaylist?: boolean;
  title?: string;
  channel?: string;
  thumbnail?: string;
}

export default function VideoPlayer({
  videoId,
  isPlaylist = false,
  title,
  channel,
  thumbnail,
}: VideoPlayerProps) {
  const [hydrated, setHydrated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const silentAudioRef = useRef<HTMLAudioElement>(null);
  const isPlayingRef = useRef(false);
  const zoom = usePinchZoom(containerRef);

  const displayTitle = title || "YouTube Video";
  const displayChannel = channel || "Ad-Free YouTube Viewer";
  const displayThumbnail =
    thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  useEffect(() => setHydrated(true), []);

  const sendIframeCommand = useCallback((func: string, args: any = "") => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    }
  }, []);

  // Listen to YouTube player state changes via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data.event === "onStateChange") {
          // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
          if (data.info === 1) {
            isPlayingRef.current = true;
            silentAudioRef.current?.play().catch(() => {});
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "playing";
            }
          } else if (data.info === 2 || data.info === 0) {
            isPlayingRef.current = false;
            silentAudioRef.current?.pause();
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "paused";
            }
          }
        }
      } catch {
        // Not a JSON message or unrelated message
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Lock Screen MediaSession integration
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: displayTitle,
        artist: displayChannel,
        album: "Ad-Free YouTube Player",
        artwork: [
          { src: displayThumbnail, sizes: "96x96", type: "image/jpeg" },
          { src: displayThumbnail, sizes: "192x192", type: "image/jpeg" },
          { src: displayThumbnail, sizes: "512x512", type: "image/jpeg" },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        sendIframeCommand("playVideo");
        silentAudioRef.current?.play().catch(() => {});
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        sendIframeCommand("pauseVideo");
        silentAudioRef.current?.pause();
      });

      navigator.mediaSession.setActionHandler("seekbackward", () => {
        sendIframeCommand("seekTo", [-10, false]);
      });

      navigator.mediaSession.setActionHandler("seekforward", () => {
        sendIframeCommand("seekTo", [10, false]);
      });
    } catch (e) {
      console.warn("MediaSession setup warning:", e);
    }
  }, [displayTitle, displayChannel, displayThumbnail, sendIframeCommand]);

  // Lock Screen / Background tab auto-resume protection
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.hidden && isPlayingRef.current) {
        // Browser/YouTube tries to pause when screen locks
        silentAudioRef.current?.play().catch(() => {});
        setTimeout(() => {
          sendIframeCommand("playVideo");
        }, 150);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sendIframeCommand]);

  if (!hydrated) {
    return (
      <Card className="p-10 text-center text-muted-foreground border-dashed border">
        Loading player...
      </Card>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const src = isPlaylist
    ? `https://www.youtube.com/embed/videoseries?list=${videoId}&autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${origin}`
    : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${origin}`;

  const handleResetZoom = () => {
    if (containerRef.current) {
      containerRef.current.style.transform = "translate(0, 0) scale(1)";
    }
  };

  return (
    <Card className="overflow-hidden bg-card border-border">
      {/* Background audio anchor element to keep mobile audio pipeline active */}
      <audio
        ref={silentAudioRef}
        src={SILENT_AUDIO_DATA}
        loop
        playsInline
        preload="auto"
      />

      {/* Zoom Controls - Mobile Only */}
      <div className="md:hidden flex items-center justify-between gap-2 p-2.5 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ZoomIn className="h-3.5 w-3.5 text-primary" />
          <span>Pinch to zoom</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3 text-green-500" />
          <span>Lock screen audio supported</span>
        </div>
        {zoom.scale > 1 && (
          <button
            onClick={handleResetZoom}
            className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Reset
          </button>
        )}
      </div>

      {/* Video Container with Pinch Zoom */}
      <div
        ref={containerRef}
        className="relative w-full origin-center"
        style={{ paddingBottom: "56.25%", touchAction: "pinch-zoom" }}
      >
        <iframe
          ref={iframeRef}
          key={videoId}
          className="absolute top-0 left-0 w-full h-full pointer-events-auto"
          src={src}
          title={isPlaylist ? "YouTube playlist" : "YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {isPlaylist && (
        <div className="text-center text-sm text-muted-foreground py-2">
          🎵 Playing YouTube playlist
        </div>
      )}
    </Card>
  );
}
