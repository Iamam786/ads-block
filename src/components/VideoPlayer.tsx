"use client";

import { Card } from "../components/ui/card";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePinchZoom } from "../hooks/usePinchZoom";
import { ZoomIn, Lock, Music, Radio } from "lucide-react";

interface VideoPlayerProps {
  videoId: string;
  isPlaylist?: boolean;
  title?: string;
  channel?: string;
  thumbnail?: string;
  onSwitchToAudio?: () => void;
}

// Generate a valid 3-second silent PCM WAV Blob URL so Android OS recognizes a non-zero duration active track
function createSilentAudioBlobUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    const sampleRate = 8000;
    const durationSec = 3;
    const numSamples = durationSec * sampleRate;
    const buffer = new ArrayBuffer(44 + numSamples);
    const view = new DataView(buffer);

    // RIFF identifier
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // format chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true); // 8-bit
    // data chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, numSamples, true);

    // 8-bit PCM center is 128 (silence)
    new Uint8Array(buffer, 44).fill(128);

    const blob = new Blob([buffer], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}

export default function VideoPlayer({
  videoId,
  isPlaylist = false,
  title,
  channel,
  thumbnail,
  onSwitchToAudio,
}: VideoPlayerProps) {
  const [hydrated, setHydrated] = useState(false);
  const [silentAudioUrl, setSilentAudioUrl] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const silentAudioRef = useRef<HTMLAudioElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  const isPlayingRef = useRef(false);
  const wasPlayingWhenHiddenRef = useRef(false);
  const userPausedRef = useRef(false);
  const currentPlaybackTimeRef = useRef(0);
  const zoom = usePinchZoom(containerRef);

  const displayTitle = title || "YouTube Video";
  const displayChannel = channel || "Ad-Free YouTube Viewer";
  const displayThumbnail =
    thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  useEffect(() => {
    setHydrated(true);
    currentPlaybackTimeRef.current = 0;
    const url = createSilentAudioBlobUrl();
    setSilentAudioUrl(url);

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [videoId]);

  // Track playback seconds continuously while video is playing
  useEffect(() => {
    const timer = setInterval(() => {
      if (isPlayingRef.current && typeof document !== "undefined" && !document.hidden) {
        currentPlaybackTimeRef.current += 1;
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
            userPausedRef.current = false;
            wasPlayingWhenHiddenRef.current = false;

            // Start silent anchor audio so Android OS attaches MediaSession
            silentAudioRef.current?.play().catch(() => {});
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "playing";
            }
          } else if (data.info === 2) {
            // PAUSED: Check if paused because phone was locked / tab minimized
            if (typeof document !== "undefined" && document.hidden) {
              // The phone locked or browser was minimized!
              wasPlayingWhenHiddenRef.current = true;

              // Immediately switch to real background audio stream so sound never stops!
              if (bgAudioRef.current) {
                bgAudioRef.current.currentTime = currentPlaybackTimeRef.current;
                bgAudioRef.current.play().catch(() => {
                  silentAudioRef.current?.play().catch(() => {});
                });
              } else {
                silentAudioRef.current?.play().catch(() => {});
              }

              if ("mediaSession" in navigator) {
                navigator.mediaSession.playbackState = "playing";
              }
            } else {
              // User deliberately paused on the screen
              isPlayingRef.current = false;
              userPausedRef.current = true;
              silentAudioRef.current?.pause();
              bgAudioRef.current?.pause();
              if ("mediaSession" in navigator) {
                navigator.mediaSession.playbackState = "paused";
              }
            }
          } else if (data.info === 0) {
            // ENDED
            isPlayingRef.current = false;
            silentAudioRef.current?.pause();
            bgAudioRef.current?.pause();
            currentPlaybackTimeRef.current = 0;
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "none";
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

  // Lock Screen MediaSession integration (Control Center & Lock Screen widget)
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

      // User taps "Play" on notification panel, lock screen, or control center
      navigator.mediaSession.setActionHandler("play", () => {
        userPausedRef.current = false;
        isPlayingRef.current = true;
        navigator.mediaSession.playbackState = "playing";

        // If screen is locked / document is hidden, play native background audio stream
        // so that in mobile mode / PWA, sound plays even when iframe is blocked by mobile Chrome!
        if (typeof document !== "undefined" && document.hidden && bgAudioRef.current) {
          bgAudioRef.current.currentTime = currentPlaybackTimeRef.current;
          bgAudioRef.current.play().catch(() => {
            silentAudioRef.current?.play().catch(() => {});
          });
        } else {
          silentAudioRef.current?.play().catch(() => {});
          sendIframeCommand("playVideo");
        }
      });

      // User taps "Pause" on notification panel or lock screen
      navigator.mediaSession.setActionHandler("pause", () => {
        userPausedRef.current = true;
        isPlayingRef.current = false;
        silentAudioRef.current?.pause();
        bgAudioRef.current?.pause();
        sendIframeCommand("pauseVideo");
        navigator.mediaSession.playbackState = "paused";
      });

      navigator.mediaSession.setActionHandler("seekbackward", () => {
        sendIframeCommand("seekTo", [-10, false]);
        currentPlaybackTimeRef.current = Math.max(0, currentPlaybackTimeRef.current - 10);
        if (bgAudioRef.current) {
          bgAudioRef.current.currentTime = Math.max(0, bgAudioRef.current.currentTime - 10);
        }
      });

      navigator.mediaSession.setActionHandler("seekforward", () => {
        sendIframeCommand("seekTo", [10, false]);
        currentPlaybackTimeRef.current += 10;
        if (bgAudioRef.current) {
          bgAudioRef.current.currentTime += 10;
        }
      });
    } catch (e) {
      console.warn("MediaSession setup warning:", e);
    }
  }, [displayTitle, displayChannel, displayThumbnail, sendIframeCommand]);

  // Lock Screen / Background tab handling (Automatic Audio Handoff on Screen Lock)
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isPlayingRef.current && !userPausedRef.current) {
          wasPlayingWhenHiddenRef.current = true;

          // Seamless background switch: Start native audio stream so sound does not stop!
          if (bgAudioRef.current) {
            bgAudioRef.current.currentTime = currentPlaybackTimeRef.current;
            bgAudioRef.current.play().catch(() => {
              silentAudioRef.current?.play().catch(() => {});
            });
          } else {
            silentAudioRef.current?.play().catch(() => {});
          }

          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
        }
      } else {
        // Phone unlocked or browser reopened
        if (wasPlayingWhenHiddenRef.current) {
          wasPlayingWhenHiddenRef.current = false;
          // If native bg audio was playing while screen was locked, sync time back to video iframe
          if (bgAudioRef.current && !bgAudioRef.current.paused) {
            const time = bgAudioRef.current.currentTime;
            bgAudioRef.current.pause();
            if (time > 0) {
              currentPlaybackTimeRef.current = time;
              sendIframeCommand("seekTo", [time, true]);
            }
          }
          // Resume video playback in the iframe
          sendIframeCommand("playVideo");
        }
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
      {/* Background audio anchor element to keep Android OS audio focus & notification alive */}
      {silentAudioUrl && (
        <audio
          ref={silentAudioRef}
          src={silentAudioUrl}
          loop
          playsInline
          preload="auto"
        />
      )}

      {/* Native background audio stream for PWA & mobile lock-screen playback */}
      <audio
        ref={bgAudioRef}
        src={`/api/stream?type=audio&videoId=${videoId}`}
        playsInline
        preload="auto"
      />

      {/* Top Banner - Mobile Zoom & Lock Screen Status */}
      <div className="flex items-center justify-between gap-2 p-2.5 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-green-500" />
          <span className="font-medium text-foreground">Lock Screen Background Audio Enabled</span>
        </div>
        <div className="flex items-center gap-2">
          {zoom.scale > 1 && (
            <button
              onClick={handleResetZoom}
              className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Reset Zoom
            </button>
          )}
          {onSwitchToAudio && (
            <button
              onClick={onSwitchToAudio}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-primary text-primary-foreground font-semibold rounded-md shadow-sm transition-transform active:scale-95"
              title="Continuous background playback with screen turned off"
            >
              <Music className="h-3 w-3" />
              <span>Audio Mode</span>
            </button>
          )}
        </div>
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
