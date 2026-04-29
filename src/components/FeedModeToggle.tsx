"use client";

import { Button } from "./ui/button";
import { FEED_CONFIG, type FeedMode } from "@/lib/feedConfig";

interface FeedModeToggleProps {
  currentMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
  isLoading?: boolean;
}

export function FeedModeToggle({
  currentMode,
  onModeChange,
  isLoading = false,
}: FeedModeToggleProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-sm font-medium text-muted-foreground">
        Feed Mode:
      </span>
      <div className="flex gap-2">
        {(["recommended", "news"] as FeedMode[]).map((mode) => {
          const config = FEED_CONFIG[mode];
          return (
            <Button
              key={mode}
              variant={currentMode === mode ? "default" : "outline"}
              size="sm"
              onClick={() => onModeChange(mode)}
              disabled={isLoading}
              className="gap-2"
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
