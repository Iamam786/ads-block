"use client";

import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useEffect, useState, useRef } from "react";
import { usePinchZoom } from "@/hooks/usePinchZoom";
import { useHumanBlur } from "@/hooks/useHumanBlur";
import { useFaceBlur } from "@/hooks/useFaceBlur";
import { Eye, EyeOff, Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface VideoPlayerWithBlurProps {
  videoId: string;
  isPlaylist?: boolean;
}

export default function VideoPlayerWithBlur({
  videoId,
  isPlaylist = false,
}: VideoPlayerWithBlurProps) {
  const [hydrated, setHydrated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const zoom = usePinchZoom(containerRef);
  const { 
    isEnabled: isHumanBlurEnabled, 
    isLoading: isHumanBlurLoading, 
    enableBlur: enableHumanBlur, 
    disableBlur: disableHumanBlur, 
    canvasRef: humanCanvasRef 
  } = useHumanBlur(videoRef);

  const {
    isEnabled: isFaceBlurEnabled,
    isSupported: isFaceDetectorSupported,
    isLoading: isFaceBlurLoading,
    enableBlur: enableFaceBlur,
    disableBlur: disableFaceBlur,
    canvasRef: faceCanvasRef,
  } = useFaceBlur(videoRef);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <Card className="p-10 text-center text-muted-foreground border-dashed border">
        Loading player...
      </Card>
    );
  }

  const toggleHumanBlur = async () => {
    if (isHumanBlurEnabled) {
      disableHumanBlur();
      setIsStreaming(false);
    } else {
      disableFaceBlur();
      setIsStreaming(true);
      await enableHumanBlur();
    }
  };

  const toggleFaceBlur = async () => {
    if (isFaceBlurEnabled) {
      disableFaceBlur();
      setIsStreaming(false);
    } else {
      disableHumanBlur();
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
    if (streamUrl && videoRef.current) {
      videoRef.current.src = streamUrl;
      videoRef.current.play().catch(console.error);
    }
  }, [streamUrl]);

  const isAnyBlurEnabled = isHumanBlurEnabled || isFaceBlurEnabled;
  const activeCanvasRef = isFaceBlurEnabled ? faceCanvasRef : humanCanvasRef;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="flex gap-2">
          <Button
            onClick={toggleHumanBlur}
            disabled={isHumanBlurLoading || isFaceBlurLoading}
            variant={isHumanBlurEnabled ? "default" : "outline"}
            className="gap-2"
          >
            {isHumanBlurLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isHumanBlurEnabled ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            Human Blur
          </Button>

          <Button
            onClick={toggleFaceBlur}
            disabled={isHumanBlurLoading || isFaceBlurLoading || !isFaceDetectorSupported}
            variant={isFaceBlurEnabled ? "default" : "outline"}
            className="gap-2"
          >
            {isFaceBlurLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isFaceBlurEnabled ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            Face Blur (AI)
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {isHumanBlurEnabled && "🔍 TensorFlow is blurring detected humans"}
          {isFaceBlurEnabled && "👤 FaceDetector API is blurring detected faces"}
          {!isFaceDetectorSupported && "⚠️ FaceDetector API not supported in this browser"}
        </p>
      </div>

      {isAnyBlurEnabled && (
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4" />
          <AlertDescription>
            AI Blur is active. The video is being processed through a secure stream to enable privacy protection.
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden bg-card border-border relative">
        {/* Main Video Player */}
        <div
          ref={containerRef}
          className="relative w-full origin-center"
          style={{ paddingBottom: "56.25%", touchAction: "pinch-zoom" }}
        >
          <iframe
            key={videoId}
            className={`absolute top-0 left-0 w-full h-full pointer-events-auto ${isAnyBlurEnabled ? 'hidden' : 'opacity-100'}`}
            src={
              isPlaylist
                ? `https://www.youtube.com/embed/videoseries?list=${videoId}&autoplay=1&playsinline=1&rel=0&modestbranding=1`
                : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
            }
            title={isPlaylist ? "YouTube playlist" : "YouTube video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          
          {/* AI-ready Video Element */}
          <video 
            ref={videoRef} 
            className={`absolute top-0 left-0 w-full h-full object-contain bg-black ${isAnyBlurEnabled ? 'block' : 'hidden'}`}
            playsInline
            controls
            crossOrigin="anonymous"
          />
          
          {/* Blur Overlay Canvas */}
          {isAnyBlurEnabled && (
            <canvas
              ref={activeCanvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
              style={{ objectFit: "contain" }}
            />
          )}
        </div>

        {/* Hidden processing elements */}
        {!isFaceBlurEnabled && (
          <canvas ref={humanCanvasRef} className="hidden" style={{ display: "none" }} />
        )}
      </Card>
    </div>
  );
}
