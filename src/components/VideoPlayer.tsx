"use client";

import { Card } from "../components/ui/card";

import { useCallback, useEffect, useState } from "react";

interface VideoPlayerProps {
  videoId: string;
  isPlaylist?: boolean;
}

export default function VideoPlayer({
  videoId,
  isPlaylist = false,
}: VideoPlayerProps) {
  const [hydrated, setHydrated] = useState(false);

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
    void lockOrientation("portrait");
  }, [lockOrientation]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreenActive = Boolean(document.fullscreenElement);

      if (fullscreenActive) {
        void lockOrientation("landscape");
      } else {
        void lockOrientation("portrait");
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [lockOrientation]);

  if (!hydrated) {
    // simple fallback during SSR (avoids mismatch)
    return (
      <Card className="p-10 text-center text-muted-foreground border-dashed border">
        Loading player...
      </Card>
    );
  }

  const src = isPlaylist
    ? `https://www.youtube.com/embed/videoseries?list=${videoId}&autoplay=1&playsinline=1&rel=0&modestbranding=1`
    : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;

  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          key={videoId} // force re-render when switching
          className="absolute top-0 left-0 w-full h-full"
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
