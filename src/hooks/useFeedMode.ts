import { useState, useEffect } from 'react';
import {
  FeedMode,
  getFeedModeFromStorage,
  saveFeedModeToStorage,
} from '../lib/feedConfig';

export function useFeedMode() {
  const [mode, setMode] = useState<FeedMode>('recommended');
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedMode = getFeedModeFromStorage();
    setMode(savedMode);
    setIsHydrated(true);
  }, []);

  // Save to localStorage when mode changes
  const updateMode = (newMode: FeedMode) => {
    setMode(newMode);
    saveFeedModeToStorage(newMode);
  };

  return {
    mode,
    updateMode,
    isHydrated,
  };
}