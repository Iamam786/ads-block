"use client";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  videoId: string;
  isPlaylist?: boolean;
}

export default function VideoPlayer({
  videoId,
  isPlaylist = false,
}: VideoPlayerProps) {
  const [hydrated, setHydrated] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        // Ignore unsupported lock failures on some mobile browsers.
      }
    },
    []
  );

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    // ensures component only renders iframe after hydration
    setHydrated(true);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreenActive = Boolean(document.fullscreenElement);
      setIsFullscreen(fullscreenActive);

      if (!fullscreenActive) {
        void lockOrientation("portrait");
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [lockOrientation]);

  const handleZoomToggle = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      try {
        await container.requestFullscreen();
        await lockOrientation("landscape");
      } catch {
        // Fullscreen may fail without a direct user gesture.
      }
      return;
    }

    try {
      await document.exitFullscreen();
    } catch {
      // Ignore if fullscreen exit is unavailable.
    }
  };

  if (!hydrated) {
    // simple fallback during SSR (avoids mismatch)
    return (
      <Card className="p-10 text-center text-muted-foreground border-dashed border">
        Loading player...
      </Card>
    );
  }

  const src = isPlaylist
    ? `https://www.youtube.com/embed/videoseries?list=${videoId}&autoplay=1&playsinline=1&rel=0&modestbranding=1&fs=0`
    : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&fs=0`;

  return (
    <Card className="overflow-hidden bg-card border-border">
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ paddingBottom: "56.25%" }}
      >
        <iframe
          key={videoId} // force re-render when switching
          className="absolute top-0 left-0 w-full h-full"
          src={src}
          title={isPlaylist ? "YouTube playlist" : "YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={handleZoomToggle}
          className="absolute bottom-3 right-3 z-10 bg-black/60 text-white hover:bg-black/80"
          aria-label={isFullscreen ? "Exit zoom mode" : "Enter zoom mode"}
          title={isFullscreen ? "Exit zoom mode" : "Enter zoom mode"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isPlaylist && (
        <div className="text-center text-sm text-muted-foreground py-2">
          🎵 Playing YouTube playlist
        </div>
      )}
    </Card>
  );
}
