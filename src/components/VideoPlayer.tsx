"use client";
import { Card } from "../components/ui/card";

import { useEffect, useState } from "react";

interface VideoPlayerProps {
  videoId: string;
  isPlaylist?: boolean;
}

export default function VideoPlayer({
  videoId,
  isPlaylist = false,
}: VideoPlayerProps) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    // ensures component only renders iframe after hydration
    setHydrated(true);
  }, []);

  if (!hydrated) {
    // simple fallback during SSR (avoids mismatch)
    return (
      <Card className="p-10 text-center text-muted-foreground border-dashed border">
        Loading player...
      </Card>
    );
  }

  const src = isPlaylist
    ? `https://www.youtube.com/embed/videoseries?list=${videoId}`
    : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;

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
