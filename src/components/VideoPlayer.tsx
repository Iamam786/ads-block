"use client";

import { Card } from "../components/ui/card";
import { useEffect, useState, useRef } from "react";
import { usePinchZoom } from "../hooks/usePinchZoom";
import { ZoomIn, ZoomOut } from "lucide-react";

interface VideoPlayerProps {
  videoId: string;
  isPlaylist?: boolean;
}

export default function VideoPlayer({
  videoId,
  isPlaylist = false,
}: VideoPlayerProps) {
  const [hydrated, setHydrated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoom = usePinchZoom(containerRef);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <Card className="p-10 text-center text-muted-foreground border-dashed border">
        Loading player...
      </Card>
    );
  }

  const src = isPlaylist
    ? `https://www.youtube.com/embed/videoseries?list=${videoId}&autoplay=1&playsinline=1&rel=0&modestbranding=1`
    : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;

  const handleResetZoom = () => {
    if (containerRef.current) {
      containerRef.current.style.transform = "translate(0, 0) scale(1)";
    }
  };

  return (
    <Card className="overflow-hidden bg-card border-border">
      {/* Zoom Controls - Mobile Only */}
      <div className="md:hidden flex items-center gap-2 p-3 bg-muted/50 border-b border-border">
        <div className="flex-1 flex items-center gap-2 text-xs text-muted-foreground">
          <ZoomIn className="h-4 w-4" />
          <span>Pinch to zoom • Double-tap to reset</span>
        </div>
        {zoom.scale > 1 && (
          <button
            onClick={handleResetZoom}
            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
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
