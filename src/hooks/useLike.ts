import { useState, useCallback, useEffect } from 'react';

interface UseLikeProps {
  videoId: string;
}

const LIKES_STORAGE_KEY = 'youtube-viewer-likes';

export function useLike({ videoId }: UseLikeProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Load likes from localStorage
  const loadLikes = useCallback(() => {
    if (typeof window === 'undefined') return;

    const storedLikes = localStorage.getItem(LIKES_STORAGE_KEY);
    const likes = storedLikes ? JSON.parse(storedLikes) : {};

    // Check if current video is liked
    const videoLikes = likes[videoId] || 0;
    setLikeCount(videoLikes);
    setIsLiked(videoLikes > 0);
  }, [videoId]);

  // Toggle like
  const toggleLike = useCallback(() => {
    if (typeof window === 'undefined') return;

    const storedLikes = localStorage.getItem(LIKES_STORAGE_KEY);
    const likes = storedLikes ? JSON.parse(storedLikes) : {};

    if (isLiked) {
      // Unlike - decrement count
      if (likes[videoId] > 1) {
        likes[videoId]--;
      } else {
        delete likes[videoId];
      }
      setIsLiked(false);
      setLikeCount(likes[videoId] || 0);
    } else {
      // Like - increment count
      likes[videoId] = (likes[videoId] || 0) + 1;
      setIsLiked(true);
      setLikeCount(likes[videoId]);
    }

    // Save to localStorage
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));
  }, [videoId, isLiked]);

  // Load likes on mount and when videoId changes
  useEffect(() => {
    loadLikes();
  }, [videoId, loadLikes]);

  return {
    isLiked,
    likeCount,
    toggleLike,
  };
}