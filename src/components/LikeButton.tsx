"use client";

import { Heart, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useLike } from "@/hooks/useLike";
import { useState } from "react";

interface LikeButtonProps {
  videoId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  showCount?: boolean;
}

export function LikeButton({
  videoId,
  variant = "outline",
  size = "sm",
  showCount = true,
}: LikeButtonProps) {
  const { isLiked, likeCount, toggleLike } = useLike({ videoId });
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    toggleLike();
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <Button
      onClick={handleClick}
      variant={isLiked ? "default" : variant}
      size={size}
      className={`gap-2 transition-all ${
        isLiked ? "bg-red-500 hover:bg-red-600 text-white" : ""
      } ${isAnimating ? "scale-110" : "scale-100"}`}
    >
      <Heart
        className={`h-4 w-4 transition-all ${
          isLiked ? "fill-current" : ""
        } ${isAnimating ? "scale-125" : "scale-100"}`}
      />
      {showCount && likeCount > 0 && (
        <span className="text-xs font-semibold">{likeCount}</span>
      )}
    </Button>
  );
}
