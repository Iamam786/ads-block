"use client";
import { useState, useEffect, useCallback } from "react";
import { Play, Loader2, X, ChevronDown } from "lucide-react";

interface VideoResult {
  videoId: string;
  title: string;
  thumbnail: string;
  channel: string;
}

export default function SearchResults({
  query,
  onSelectVideo,
}: {
  query: string;
  onSelectVideo: (videoId: string) => void;
}) {
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchResults = useCallback(
    async (pageToken?: string) => {
      if (pageToken) {
        setIsLoadingMore(true);
      } else {
        setLoading(true);
        setResults([]);
      }
      setError("");

      try {
        const url = `/api/youtube-search?query=${encodeURIComponent(query)}${
          pageToken ? `&pageToken=${pageToken}` : ""
        }`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          const newVideos = data.videos || [];
          if (pageToken) {
            setResults((prev) => [...prev, ...newVideos]);
          } else {
            setResults(newVideos);
            setIsOpen(true);
          }
          setNextPageToken(data.nextPageToken || null);
        }
      } catch (err) {
        console.error("Search error:", err);
        setError("Search failed");
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [query]
  );

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setIsOpen(false);
      setNextPageToken(null);
      return;
    }

    const timer = setTimeout(() => {
      fetchResults();
    }, 500);

    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  const handleLoadMore = () => {
    if (nextPageToken && !isLoadingMore) {
      fetchResults(nextPageToken);
    }
  };

  if (!query || query.length < 2 || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}>
      <div
        className="absolute top-24 left-1/2 transform -translate-x-1/2 w-full max-w-3xl max-h-[500px] bg-card border border-border rounded-lg shadow-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="flex justify-between items-center p-3 border-b border-border bg-muted/30 flex-shrink-0">
          <span className="text-sm font-medium text-foreground">
            Search Results ({results.length})
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-accent rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results list with scroll */}
        <div className="overflow-y-auto flex-1">
          {loading && results.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-red-500 text-sm">
              ⚠️ {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="divide-y divide-border">
              {results.map((video) => (
                <div
                  key={video.videoId}
                  className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    onSelectVideo(video.videoId);
                    setIsOpen(false);
                  }}
                >
                  {/* Thumbnail */}
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="h-14 w-20 rounded object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.jpg";
                    }}
                  />

                  {/* Video info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground line-clamp-2">
                      {video.title}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {video.channel}
                    </p>
                  </div>

                  {/* Play icon */}
                  <Play className="h-5 w-5 text-primary flex-shrink-0" />
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && !error && query.length >= 2 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No videos found for "{query}"
            </div>
          )}

          {/* Load More Button */}
          {nextPageToken && results.length > 0 && (
            <div className="p-3 text-center border-t border-border">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded text-sm font-medium text-primary transition-colors disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Load More Results
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
