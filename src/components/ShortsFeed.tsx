"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "./ui/card";
import { Loader2, Volume2, VolumeX } from "lucide-react";

interface Video {
  videoId: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface ShortsItem {
  videoId: string;
  ref: React.RefObject<HTMLDivElement>;
  isActive: boolean;
}

interface ShortsFeedProps {
  videos: Video[];
  onVideoSelect?: (videoId: string) => void;
}

export default function ShortsFeed({ videos, onVideoSelect }: ShortsFeedProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const shortsRefs = useRef<React.RefObject<HTMLDivElement | null>[]>([]);

  // Initialize refs
  useEffect(() => {
    shortsRefs.current = videos.map(() => React.createRef<HTMLDivElement>());
  }, [videos.length]);

  // Setup Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = shortsRefs.current.findIndex(
              (ref) => ref.current === entry.target,
            );
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        });
      },
      {
        threshold: 0.5,
      },
    );

    shortsRefs.current.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = Math.min(activeIndex + 1, videos.length - 1);
        shortsRefs.current[nextIndex]?.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = Math.max(activeIndex - 1, 0);
        shortsRefs.current[prevIndex]?.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, videos.length]);

  if (videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth scrollbar-hide"
        style={{ scrollBehavior: "smooth" }}
      >
        {videos.map((video, index) => (
          <div
            key={video.videoId}
            ref={shortsRefs.current[index]}
            className="h-screen w-full shrink-0 snap-center flex flex-col items-center justify-center bg-black relative group"
          >
            {/* Thumbnail/Video */}
            <div className="w-full h-full relative flex items-center justify-center bg-linear-to-b from-black/50 to-black">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover"
              />

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />

              {/* Play Button (if not active) */}
              {activeIndex !== index && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-20 h-20 rounded-full bg-white/30 flex items-center justify-center backdrop-blur">
                    <div className="w-0 h-0 border-l-12 border-l-white border-t-8 border-t-transparent border-b-8 border-b-transparent ml-1" />
                  </div>
                </div>
              )}
            </div>

            {/* Video Info - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
              <h3 className="text-white font-semibold line-clamp-2 text-sm mb-1">
                {video.title}
              </h3>
              <p className="text-white/70 text-xs">{video.channel}</p>
            </div>

            {/* Right Controls */}
            <div className="absolute right-4 bottom-20 flex flex-col gap-4 z-10">
              {/* Like Button */}
              <button className="flex flex-col items-center gap-1 text-white hover:text-red-500 transition">
                <div className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center backdrop-blur">
                  ❤️
                </div>
                <span className="text-xs">0</span>
              </button>

              {/* Comment Button */}
              <button className="flex flex-col items-center gap-1 text-white hover:text-blue-400 transition">
                <div className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center backdrop-blur">
                  💬
                </div>
                <span className="text-xs">0</span>
              </button>

              {/* Share Button */}
              <button className="flex flex-col items-center gap-1 text-white hover:text-green-400 transition">
                <div className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center backdrop-blur">
                  ↗️
                </div>
                <span className="text-xs">0</span>
              </button>
            </div>

            {/* Mute Toggle - Top Right */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center backdrop-blur text-white transition"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>

            {/* Progress Indicator */}
            <div className="absolute top-2 left-4 right-4 h-0.5 bg-white/20 rounded z-20">
              <div
                className="h-full bg-white rounded transition-all"
                style={{
                  width: `${((index + 1) / videos.length) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Scrollbar Hide CSS */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
