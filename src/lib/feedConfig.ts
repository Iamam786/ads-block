export type FeedMode = 'recommended' | 'news';

export const FEED_CONFIG = {
  recommended: {
    label: 'Recommended',
    icon: '📺',
    description: 'Personalized recommendations',
  },
  news: {
    label: 'News Mode',
    icon: '📰',
    description: 'Latest news & world updates',
  },
};

// News keywords for search-based feed
export const NEWS_KEYWORDS = [
  'world news',
  'latest news today',
  'breaking news',
  'technology news',
  'business news',
  'sports news',
  'health news',
];

// YouTube category IDs (for reference)
export const YOUTUBE_CATEGORIES = {
  TRENDING: 0,
  NEWS: 25,
  TECH: 28,
  BUSINESS: 15,
  SPORTS: 17,
};

// Local storage key
export const FEED_MODE_STORAGE_KEY = 'youtube-viewer-feed-mode';

export function getFeedModeFromStorage(): FeedMode {
  if (typeof window === 'undefined') return 'recommended';
  const stored = localStorage.getItem(FEED_MODE_STORAGE_KEY);
  return (stored as FeedMode) || 'recommended';
}

export function saveFeedModeToStorage(mode: FeedMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FEED_MODE_STORAGE_KEY, mode);
}