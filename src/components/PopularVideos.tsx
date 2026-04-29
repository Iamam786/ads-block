"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { type FeedMode } from "@/lib/feedConfig";

interface Video {
  videoId: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface PopularVideosProps {
  setVideoId: (id: string) => void;
  setSearchInput: (text: string) => void;
  setAudioMode: (mode: boolean) => void;
  player: any;
  setIsPlaylist: (isPlaylist: boolean) => void;
  feedMode: FeedMode;
  searchQuery?: string;
}

export default function PopularVideos({
  setVideoId,
  setSearchInput,
  setAudioMode,
  player,
  setIsPlaylist,
  feedMode,
  searchQuery = "",
}: PopularVideosProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async (currentMode: FeedMode, query: string) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = "";
      if (query) {
        endpoint = `/api/youtube-search?query=${encodeURIComponent(query)}`;
      } else {
        endpoint =
          currentMode === "news"
            ? "/api/youtube-search-news"
            : "/api/youtube-search?query=trending";
      }

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.videos) {
        setVideos(data.videos);
      }
    } catch (error) {
      console.error("Failed to fetch videos:", error);
      setError("Failed to load videos. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchVideos(feedMode, searchQuery);
  }, [feedMode, searchQuery]);

  const handleSelectVideo = (videoId: string) => {
    setVideoId(videoId);
    setSearchInput("");
    setAudioMode(false);
    if (player) player.destroy();
    setIsPlaylist(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">
                Fetching latest content...
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center border border-dashed border-red-500/30 rounded-2xl bg-red-500/5">
            <p className="text-red-500 font-medium mb-2">⚠️ {error}</p>
            <button
              onClick={() => fetchVideos(feedMode, searchQuery)}
              className="text-xs text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && videos.length === 0 && (
          <div className="p-12 text-center border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground">
              No videos found. Try a different search or mode.
            </p>
          </div>
        )}

        {!loading && !error && videos.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <Card
                key={video.videoId}
                className="cursor-pointer overflow-hidden border-border bg-card transition-all hover:shadow-2xl hover:-translate-y-1 group"
                onClick={() => handleSelectVideo(video.videoId)}
              >
                <div className="relative bg-muted pb-[56.25%] overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                </div>
                <div className="p-4">
                  <h3 className="mb-2 line-clamp-2 text-sm font-semibold group-hover:text-primary transition-colors">
                    {video.title}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {video.channel}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
