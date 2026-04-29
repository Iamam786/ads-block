"use client";

import { useState, useEffect, useRef } from "react";
import { Search, History, ArrowUpLeft } from "lucide-react";

interface SearchSuggestionsProps {
  query: string;
  onSelectSuggestion: (suggestion: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export default function SearchSuggestions({
  query,
  onSelectSuggestion,
  isVisible,
  onClose,
}: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/suggestions?query=${encodeURIComponent(query)}`,
        );
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setActiveIndex(-1);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        onSelectSuggestion(suggestions[activeIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, suggestions, activeIndex, onSelectSuggestion, onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVisible, onClose]);

  if (!isVisible || (suggestions.length === 0 && !loading)) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 mt-2 bg-card/95 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[60] overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="py-2">
        {loading && suggestions.length === 0 ? (
          <div className="px-6 py-4 flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Finding suggestions...
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <button
              key={index}
              className={`w-full flex items-center gap-4 px-5 py-3 transition-all text-left group ${
                index === activeIndex ? "bg-white/10" : "hover:bg-white/5"
              }`}
              onClick={() => onSelectSuggestion(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <div className={`p-2 rounded-lg transition-colors ${
                index === activeIndex ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              }`}>
                <Search className="h-4 w-4" />
              </div>
              <span className={`flex-1 text-sm font-medium transition-colors ${
                index === activeIndex ? "text-primary" : "text-foreground group-hover:text-primary"
              }`}>
                {suggestion}
              </span>
              <ArrowUpLeft className={`h-4 w-4 transition-all transform ${
                index === activeIndex ? "text-primary opacity-100 -translate-y-0.5 translate-x-0.5" : "text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              }`} />
            </button>
          ))
        )}
      </div>
      <div className="px-5 py-2 border-t border-white/5 bg-white/5 flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">YouTube Suggestions</span>
        <div className="flex gap-2">
           <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">↑↓ to navigate</span>
           <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">Enter to search</span>
        </div>
      </div>
    </div>
  );
}
