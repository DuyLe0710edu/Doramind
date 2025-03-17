// Type declarations for youtube-api.ts

export interface VideoItem {
  id: string;
  title: string;
  channelTitle: string;
  description?: string;
  publishedAt: string;
  thumbnails: {
    high: {
      url: string;
    };
  };
  regionCode?: string;
}

export interface PlaylistItem {
  id: string;
  title: string;
  channelTitle: string;
  thumbnails: {
    high: {
      url: string;
    };
  };
  itemCount?: number;
}

// Declare other exported functions
export function clearCache(): void;
export function clearCacheByPattern(pattern: string): void;
export function checkQuotaStatus(): boolean;
export function logApiUsageStats(): void;
export function searchVideos(query: string, maxResults?: number): Promise<VideoItem[]>;
export function getMoodVideos(mood: string, maxResults?: number): Promise<VideoItem[]>;
export function getRelatedVideos(videoId: string, maxResults?: number): Promise<VideoItem[]>;
export function getTrendingMusic(maxResults?: number): Promise<VideoItem[]>;
export function getNewReleases(maxResults?: number): Promise<VideoItem[]>;
export function getFallbackDataForMood(mood: string, count: number): VideoItem[];
export function getPlaylist(playlistId: string): Promise<any>;
export function searchPlaylists(query: string, maxResults?: number): Promise<PlaylistItem[]>;
export function getChannelPlaylists(channelId: string, maxResults?: number): Promise<PlaylistItem[]>;
export function getVideoDetails(videoId: string): Promise<VideoItem | null>;
export function getMusicCategories(regionCode?: string): Promise<PlaylistItem[]>;
export function getPlaylistVideos(playlistId: string, maxResults?: number): Promise<VideoItem[]>;
export function searchMusic(query: string, maxResults?: number, regionCode?: string): Promise<VideoItem[]>;
export function getMusicByCategory(categoryId: string, maxResults?: number): Promise<VideoItem[]>; 