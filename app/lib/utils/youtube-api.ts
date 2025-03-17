// YouTube API Constants
const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Preferred regions and filtering configuration
const PREFERRED_REGIONS = ['US', 'GB', 'VN']; // US, UK, Vietnam
const EXCLUDED_KEYWORDS = [
  'indian', 
  'bollywood', 
  'hindi', 
  'punjabi', 
  'tamil', 
  'telugu', 
  'bengali',
  'desi',
  'bhangra',
  'bharatanatyam',
  'india song',
  'india music',
  'india official',
  'jukebox'
]; // Keywords to filter out

// API Key rotation system - load from environment variables
const getApiKeysFromEnv = (): string[] => {
  // First try to get the individual numbered keys
  const keys: string[] = [];
  
  // Check for numbered API keys (YOUTUBE_API_KEY_1, YOUTUBE_API_KEY_2, etc.)
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`YOUTUBE_API_KEY_${i}`];
    if (key) {
      keys.push(key);
    }
  }
  
  // If we found any numbered keys, use those
  if (keys.length > 0) {
    return keys;
  }
  
  // Fallback to the legacy key if no numbered keys are found
  const legacyKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (legacyKey) {
    return [legacyKey];
  }
  
  // No keys found, return hardcoded fallback (not ideal, but prevents crashes)
  console.warn('No YouTube API keys found in environment variables. Using fallback keys.');
  return [
    'AIzaSyAZYfQYBlxB7W6aE0NCtBfqzmUoLPG0skA',
    'AIzaSyCPmbMqyGzGNRjdKVJQN-vOQkTXwgXbq84',
    'AIzaSyDnCYUB2Jft_wN2QCbdyr621q-6kJ4zG0Y'
  ];
};

// Get API keys - we call this function only once at module load time
const API_KEYS = getApiKeysFromEnv();
console.log(`Loaded ${API_KEYS.length} YouTube API keys: ${API_KEYS.map(key => `${key.substring(0, 8)}...`).join(', ')}`);

// Track API key usage and failures
const keyUsage: Record<string, number> = {};
const keyFailures: Record<string, number> = {};
let currentKeyIndex = 0;

// Function to get the next available API key
function getApiKey(): string {
  // If we've tried all keys and they're all failing, reset failure count
  // to give them another chance (in case quota reset or temporary issue)
  if (API_KEYS.every(key => keyFailures[key] > 3)) {
    Object.keys(keyFailures).forEach(key => {
      keyFailures[key] = 0;
    });
  }
  
  // Try to find a key with fewer than 3 failures
  const startingIndex = currentKeyIndex;
  let attempts = 0;
  
  while (attempts < API_KEYS.length) {
    const key = API_KEYS[currentKeyIndex];
    // If this key hasn't failed too many times recently, use it
    if (!keyFailures[key] || keyFailures[key] < 3) {
      return key;
    }
    
    // Move to next key in rotation
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    attempts++;
  }
  
  // If all keys have failed too many times, use the current one anyway
  return API_KEYS[currentKeyIndex];
}

// Function to mark a key as failed (e.g. when quota exceeded)
function markKeyAsFailed(key: string): void {
  if (!keyFailures[key]) {
    keyFailures[key] = 1;
  } else {
    keyFailures[key]++;
  }
  
  // Move to next key for future requests
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  
  console.error(`🔑 API key ${key.substring(0, 8)}... marked as failed. Failures: ${keyFailures[key]}`);
}

// Function to track key usage
function trackKeyUsage(key: string, quota: number = 1): void {
  if (!keyUsage[key]) {
    keyUsage[key] = quota;
  } else {
    keyUsage[key] += quota;
  }
}

// Display current API key usage stats
export function logApiUsageStats(): void {
  console.log("=== YouTube API Key Usage Statistics ===");
  API_KEYS.forEach(key => {
    console.log(`🔑 Key ${key.substring(0, 8)}...: Usage: ${keyUsage[key] || 0} units, Failures: ${keyFailures[key] || 0}`);
  });
  console.log("=======================================");
}

// Types
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
  regionCode?: string; // Added region code for filtering
}

/**
 * Interface for playlist items
 */
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

interface YouTubeSearchResponse {
  items: Array<{
    id: {
      videoId: string;
    };
    snippet: {
      title: string;
      channelTitle: string;
      description: string;
      publishedAt: string;
      thumbnails: {
        high: {
          url: string;
        };
      };
    };
  }>;
  nextPageToken?: string;
}

interface YouTubeVideosResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      description: string;
      publishedAt: string;
      thumbnails: {
        high: {
          url: string;
        };
      };
    };
  }>;
}

// Cache mechanism to avoid repeated API calls for the same data
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes default cache
const EXTENDED_CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours for when we have quota issues

// Track quota status
let hasQuotaIssues = false;

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  console.log('Clearing API cache');
  Object.keys(cache).forEach(key => {
    delete cache[key];
  });
}

/**
 * Clear specific cache entries by pattern
 */
export function clearCacheByPattern(pattern: string): void {
  // If we're having quota issues, don't clear cache to prevent more API calls
  if (hasQuotaIssues) {
    console.log(`⚠️ Not clearing cache due to quota issues. Pattern: ${pattern}`);
    return;
  }
  
  console.log(`Clearing cache entries matching: ${pattern}`);
  const regex = new RegExp(pattern);
  Object.keys(cache).forEach(key => {
    if (regex.test(key)) {
      delete cache[key];
      console.log(`Cleared cache: ${key}`);
    }
  });
}

/**
 * Check if we're experiencing quota issues
 */
export function checkQuotaStatus(): boolean {
  return hasQuotaIssues;
}

/**
 * Check if content matches preferred regions or contains excluded keywords
 */
function filterByRegionAndKeywords(item: any): boolean {
  const title = item.snippet?.title || '';
  const description = item.snippet?.description || '';
  const channelTitle = item.snippet?.channelTitle || '';
  
  // Combined text to check for keywords
  const combinedText = `${title} ${description} ${channelTitle}`.toLowerCase();
  
  // Always include Vietnamese content if detected
  const isVietnamese = /việt nam|vietnamese|viet nam|cải lương|nhạc trẻ|vpop|v-pop|bài hát hay/i.test(combinedText);
  if (isVietnamese) return true;
  
  // Exclude content with excluded keywords
  for (const keyword of EXCLUDED_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      console.log(`🔍 Filtered out video "${title}" due to keyword "${keyword}"`);
      return false;
    }
  }
  
  // Additional heuristics for Indian music
  const moreSpecificIndicators = [
    // Common Indian music channels
    'T-Series', 'Zee Music', 'Sony Music India', 'Saregama', 'YRF', 'Venus',
    // Patterns in titles
    /full song|full video|official song|video song|lyrical/i
  ];
  
  // Check for these specific indicators together with general hints of Indian content
  if (combinedText.includes('india') || /song.*video|video.*song/i.test(combinedText)) {
    for (const indicator of moreSpecificIndicators) {
      if (typeof indicator === 'string') {
        if (combinedText.includes(indicator.toLowerCase())) {
          console.log(`🔍 Filtered out video "${title}" due to specific indicator "${indicator}"`);
          return false;
        }
      } else if (indicator.test(combinedText)) {
        console.log(`🔍 Filtered out video "${title}" due to pattern match`);
        return false;
      }
    }
  }
  
  // No specific region information, include it
  return true;
}

/**
 * Fetches data from YouTube API with caching and key rotation
 */
async function fetchFromYouTube(endpoint: string, params: Record<string, string>, quotaCost: number = 1): Promise<any> {
  // Get the current API key using our rotation system
  const apiKey = getApiKey();
  
  // Add regionCode parameter if not already present to prioritize specified regions
  if (!params.regionCode && endpoint === 'search') {
    params.regionCode = PREFERRED_REGIONS[0]; // Default to US
  }
  
  // Create cache key from endpoint and params (excluding the API key)
  const paramsForCacheKey = { ...params };
  const queryParams = new URLSearchParams({
    ...params,
    key: apiKey,
  }).toString();
  
  const url = `${API_BASE_URL}/${endpoint}?${queryParams}`;
  const cacheKey = `${endpoint}-${JSON.stringify(paramsForCacheKey)}`;
  
  // Use a longer cache duration if we're having quota issues
  const effectiveCacheDuration = hasQuotaIssues ? EXTENDED_CACHE_DURATION : CACHE_DURATION;
  
  // Check cache first
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < effectiveCacheDuration) {
    console.log(`🔍 Cache hit for ${endpoint} (${apiKey.substring(0, 8)}...)`);
    return cache[cacheKey].data;
  }
  
  // If we're having quota issues and not using cache, return empty results
  // This prevents continuous API calls that would fail
  if (hasQuotaIssues && !cache[cacheKey]) {
    console.log(`⚠️ Quota exceeded, skipping API call to ${endpoint} and returning empty results`);
    // Return an empty but valid response structure
    return { items: [] };
  }
  
  try {
    console.log(`🌐 Fetching from YouTube API: ${endpoint} using key ${apiKey.substring(0, 8)}...`);
    const startTime = performance.now();
    const response = await fetch(url);
    const endTime = performance.now();
    
    console.log(`⏱️ ${endpoint} request took ${(endTime - startTime).toFixed(0)}ms with key ${apiKey.substring(0, 8)}...`);
    
    if (!response.ok) {
      // If we get a 403 error, it might be quota exceeded
      if (response.status === 403) {
        console.error(`❌ Quota exceeded for key ${apiKey.substring(0, 8)}...`);
        markKeyAsFailed(apiKey);
        
        // Check if all keys have failed
        const allKeysFailed = API_KEYS.every(key => keyFailures[key] && keyFailures[key] > 0);
        if (allKeysFailed) {
          console.error('⛔ All API keys have quota issues. Setting quota issue flag.');
          hasQuotaIssues = true;
          
          // Try to return cached data even if expired
          if (cache[cacheKey]) {
            console.log('🔄 Using expired cache as fallback due to quota issues');
            return cache[cacheKey].data;
          }
          
          // If no cache, return fallback data or empty results
          return { items: [] };
        }
        
        // Try again with the next key
        return fetchFromYouTube(endpoint, params, quotaCost);
      }
      
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }
    
    // If we got here, the request was successful, so we're not having quota issues
    hasQuotaIssues = false;
    
    // Track this successful API call against the quota for this key
    trackKeyUsage(apiKey, quotaCost);
    
    const data = await response.json();
    
    // Filter results if they have items
    if (data.items && Array.isArray(data.items)) {
      const beforeCount = data.items.length;
      data.items = data.items.filter(filterByRegionAndKeywords);
      const afterCount = data.items.length;
      if (beforeCount !== afterCount) {
        console.log(`🔍 Filtered out ${beforeCount - afterCount} items from results`);
      }
    }
    
    // Log result data
    if (data.items) {
      console.log(`✅ ${endpoint} returned ${data.items.length} items`);
    }
    
    // Save to cache
    cache[cacheKey] = {
      data,
      timestamp: now,
    };
    
    return data;
  } catch (error) {
    console.error(`❌ Error fetching from YouTube API (${apiKey.substring(0, 8)}...):`, error);
    
    // Consider this a quota error if it's about quota
    if (error instanceof Error && error.message.includes('quota')) {
      hasQuotaIssues = true;
      
      // Try to return cached data even if expired
      if (cache[cacheKey]) {
        console.log('🔄 Using expired cache as fallback due to error');
        return cache[cacheKey].data;
      }
    }
    
    throw error;
  }
}

/**
 * Converts a YouTube search response item to our VideoItem format
 */
function convertSearchResultToVideoItem(item: any): VideoItem {
  return {
    id: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    thumbnails: {
      high: {
        url: item.snippet.thumbnails.high.url,
      },
    },
  };
}

/**
 * Converts a YouTube videos response item to our VideoItem format
 */
function convertVideoResultToVideoItem(item: any): VideoItem {
  return {
    id: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    thumbnails: {
      high: {
        url: item.snippet.thumbnails.high.url,
      },
    },
  };
}

/**
 * Search for videos on YouTube
 */
export async function searchVideos(query: string, maxResults = 12): Promise<VideoItem[]> {
  try {
    // Search operations cost 100 quota units each
    const data = await fetchFromYouTube('search', {
      q: query,
      part: 'snippet',
      type: 'video',
      videoEmbeddable: 'true',
      maxResults: maxResults.toString(),
    }, 100) as YouTubeSearchResponse;
    
    return data.items.map(convertSearchResultToVideoItem);
  } catch (error) {
    console.error('Error searching videos:', error);
    return [];
  }
}

/**
 * Get videos for a specific mood or genre
 */
export async function getMoodVideos(mood: string, maxResults = 12): Promise<VideoItem[]> {
  try {
    // If we're having quota issues, use appropriate fallback data immediately
    if (hasQuotaIssues) {
      console.log(`⚠️ Using fallback data for ${mood} mood due to quota issues`);
      return getFallbackDataForMood(mood, maxResults);
    }
    
    // Search operations cost 100 quota units
    const data = await fetchFromYouTube('search', {
      q: `${mood} music playlist`,
      part: 'snippet',
      type: 'video',
      videoEmbeddable: 'true',
      maxResults: maxResults.toString(),
    }, 100) as YouTubeSearchResponse;
    
    return data.items.map(convertSearchResultToVideoItem);
  } catch (error) {
    console.error(`Error getting ${mood} videos:`, error);
    
    // Return mood-appropriate fallback data if API fails
    return getFallbackDataForMood(mood, maxResults);
  }
}

/**
 * Get related videos (similar to "Mix" in YouTube Music)
 */
export async function getRelatedVideos(videoId: string, maxResults = 12): Promise<VideoItem[]> {
  try {
    // If we're having quota issues, use fallback data immediately
    if (hasQuotaIssues) {
      console.log(`⚠️ Using fallback data for related videos due to quota issues`);
      return getRandomFallbackVideos(maxResults);
    }
    
    // Search operations cost 100 quota units
    const data = await fetchFromYouTube('search', {
      relatedToVideoId: videoId,
      part: 'snippet',
      type: 'video',
      videoEmbeddable: 'true',
      maxResults: maxResults.toString(),
    }, 100) as YouTubeSearchResponse;
    
    return data.items.map(convertSearchResultToVideoItem);
  } catch (error) {
    console.error('Error getting related videos:', error);
    
    // Return fallback data if API fails
    return getRandomFallbackVideos(maxResults);
  }
}

// Update fallback data with focus on popular western and Vietnamese music
const fallbackMusicData: VideoItem[] = [
  {
    id: "MlGxz0KIqLM", // Taylor Swift - Fortnight ft. Post Malone
    title: "Taylor Swift - Fortnight ft. Post Malone",
    channelTitle: "Taylor Swift",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/MlGxz0KIqLM/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "aXzVF3XeS8M", // Lady Gaga, Bruno Mars - Die With A Smile
    title: "Lady Gaga, Bruno Mars - Die With A Smile",
    channelTitle: "Bruno Mars",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/aXzVF3XeS8M/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "L8IgYKecvoQ", // Kendrick Lamar - Not Like Us
    title: "Kendrick Lamar - Not Like Us",
    channelTitle: "Kendrick Lamar",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/L8IgYKecvoQ/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "N1HvfOLU49c", // Beyoncé - TEXAS HOLD 'EM
    title: "Beyoncé - TEXAS HOLD 'EM",
    channelTitle: "Beyoncé",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/N1HvfOLU49c/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "Z7dPtptIAFU", // Son Tung M-TP - There's No One At All
    title: "SƠN TÙNG M-TP | THERE'S NO ONE AT ALL | OFFICIAL MUSIC VIDEO",
    channelTitle: "SƠN TÙNG M-TP OFFICIAL",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/Z7dPtptIAFU/hqdefault.jpg"
      }
    },
    regionCode: "VN"
  },
  {
    id: "x4tKaKGaqxA", // Dua Lipa - Houdini
    title: "Dua Lipa - Houdini",
    channelTitle: "Dua Lipa",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/x4tKaKGaqxA/hqdefault.jpg"
      }
    },
    regionCode: "GB"
  },
  // More fallback data for better variety
  {
    id: "4-sxRVTKNUU", // Bruno Mars - Uptown Funk
    title: "Bruno Mars - Uptown Funk (Official Video) ft. Mark Ronson",
    channelTitle: "Bruno Mars",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/4-sxRVTKNUU/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "j5uAR5P5b6A", // The Weeknd - Blinding Lights
    title: "The Weeknd - Blinding Lights (Official Video)",
    channelTitle: "The Weeknd",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/j5uAR5P5b6A/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "MgFDUVKB-Mk", // My Chemical Romance - Welcome to the Black Parade
    title: "My Chemical Romance - Welcome to the Black Parade [Official Music Video]",
    channelTitle: "My Chemical Romance",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/MgFDUVKB-Mk/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "6S20mJvr4MA", // Le Cat Trong Ly - Neu Em Con Ton Tai
    title: "Lê Cát Trọng Lý - Nếu Em Còn Tồn Tại (Official MV)",
    channelTitle: "Le Cat Trong Ly Official",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/6S20mJvr4MA/hqdefault.jpg"
      }
    },
    regionCode: "VN"
  },
  {
    id: "hslbSjTxnUg", // Hoang Thuy Linh - See Tinh
    title: "Hoàng Thùy Linh - SEE TÌNH | Official Music Video",
    channelTitle: "Hoang Thuy Linh Official",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/hslbSjTxnUg/hqdefault.jpg"
      }
    },
    regionCode: "VN"
  },
  {
    id: "FElxzQhaQIY", // Son Tung MTP - Chung Ta Cua Hien Tai
    title: "SƠN TÙNG M-TP | CHÚNG TA CỦA HIỆN TẠI | OFFICIAL MUSIC VIDEO",
    channelTitle: "SƠN TÙNG M-TP OFFICIAL",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/FElxzQhaQIY/hqdefault.jpg"
      }
    },
    regionCode: "VN"
  }
];

// Focus/study music fallback data
const fallbackFocusMusicData: VideoItem[] = [
  {
    id: "5qap5aO4i9A", // lofi hip hop radio - beats to relax/study to
    title: "lofi hip hop radio - beats to relax/study to",
    channelTitle: "Lofi Girl",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "lTRiuFIWV54", // lofi hip hop radio - beats to sleep/chill to
    title: "lofi hip hop radio - beats to sleep/chill to",
    channelTitle: "Lofi Girl",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/lTRiuFIWV54/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "DWcJFNfaw9c", // Beautiful Piano Music 24/7
    title: "Beautiful Piano Music 24/7: Study Music, Relaxing Music, Sleep Music, Meditation Music",
    channelTitle: "Soothing Relaxation",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "c3QhfQBx7Fg", // Peaceful Meditation Yoga Music
    title: "Peaceful Meditation Background Music for Yoga and Relaxation",
    channelTitle: "Yellow Brick Cinema",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/c3QhfQBx7Fg/hqdefault.jpg"
      }
    },
    regionCode: "US"
  }
];

// Workout music fallback data
const fallbackWorkoutMusicData: VideoItem[] = [
  {
    id: "JKVZYmKiTZA", // Best Workout Music 2023
    title: "Best Workout Music 2023 🔥 Gym Motivation Music 2023 🔥 Workout Mix 2023",
    channelTitle: "WM Workout Music",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/JKVZYmKiTZA/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "0LJkfgGBlDI", // HIIT Workout Music Mix
    title: "HIIT Workout Music Mix 2023 🔥 Best Gym Music Playlist 2023",
    channelTitle: "Workout Music Service",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/0LJkfgGBlDI/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "fAo_ix_RTc4", // Cardio Boxing Workout
    title: "30 Minute Cardio Boxing Workout",
    channelTitle: "SELF",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/fAo_ix_RTc4/hqdefault.jpg"
      }
    },
    regionCode: "US"
  }
];

// Get fallback data appropriate for the mood
export function getFallbackDataForMood(mood: string, count: number): VideoItem[] {
  switch (mood.toLowerCase()) {
    case 'focus':
      return fallbackFocusMusicData.slice(0, count);
    case 'workout':
      return fallbackWorkoutMusicData.slice(0, count);
    case 'chill':
    case 'party':
    default:
      return getRandomFallbackVideos(count);
  }
}

// Helper to get random videos from our fallback data to introduce variety
function getRandomFallbackVideos(count: number): VideoItem[] {
  // Combine all fallback data sources for more variety
  const allFallbackVideos = [
    ...fallbackMusicData, 
    ...fallbackNewReleasesData,
    ...fallbackFocusMusicData,
    ...fallbackWorkoutMusicData
  ];
  
  // Shuffle the array using Fisher-Yates algorithm
  for (let i = allFallbackVideos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allFallbackVideos[i], allFallbackVideos[j]] = [allFallbackVideos[j], allFallbackVideos[i]];
  }
  
  // Return the requested number of videos
  return allFallbackVideos.slice(0, count);
}

/**
 * Get trending music videos
 */
export async function getTrendingMusic(maxResults = 12): Promise<VideoItem[]> {
  try {
    // If we're having quota issues, use fallback data immediately
    if (hasQuotaIssues) {
      console.log(`⚠️ Using fallback data for trending music due to quota issues`);
      return fallbackMusicData.slice(0, maxResults);
    }
    
    // Clear existing cache for trending music
    clearCacheByPattern('videos-{"part":"snippet","chart":"mostPopular","videoCategoryId":"10"');
    
    let allResults: VideoItem[] = [];
    
    // Fetch trending videos from each preferred region
    for (const region of PREFERRED_REGIONS) {
      if (allResults.length >= maxResults) break;
      
      // List operations typically cost fewer units (around 1-5)
      const data = await fetchFromYouTube('videos', {
        part: 'snippet',
        chart: 'mostPopular',
        videoCategoryId: '10', // Music category
        maxResults: Math.min(maxResults, 50).toString(),
        regionCode: region
      }, 5) as YouTubeVideosResponse;
      
      const regionResults = data.items.map(item => {
        const videoItem = convertVideoResultToVideoItem(item);
        videoItem.regionCode = region; // Store the region for reference
        return videoItem;
      });
      
      // Add unique results
      regionResults.forEach(video => {
        if (!allResults.some(existing => existing.id === video.id)) {
          allResults.push(video);
        }
      });
    }
    
    return allResults.slice(0, maxResults);
  } catch (error) {
    console.error('Error getting trending music:', error);
    
    // Return fallback data if API fails
    return fallbackMusicData.slice(0, maxResults);
  }
}

/**
 * Get new music releases (based on recent uploads from popular music channels)
 */
export async function getNewReleases(maxResults = 12): Promise<VideoItem[]> {
  try {
    // If we're having quota issues, use fallback data immediately
    if (hasQuotaIssues) {
      console.log(`⚠️ Using fallback data for new releases due to quota issues`);
      return fallbackNewReleasesData.slice(0, maxResults);
    }
    
    // Clear cache for any existing new releases to get fresh content
    clearCacheByPattern('search-{"q":"new music this week official"');
    
    const results: VideoItem[] = [];
    const queries = [
      'new music this week official',
      'new songs this week',
      'new pop music releases',
      'new western music official'
    ];
    
    // Try multiple search queries to get diverse results that aren't Indian
    for (const query of queries) {
      if (results.length >= maxResults) break;
      
      // Search operations cost 100 quota units
      const data = await fetchFromYouTube('search', {
        q: query,
        part: 'snippet',
        type: 'video',
        videoEmbeddable: 'true',
        maxResults: Math.min(25, maxResults).toString(),
        order: 'date', // Sort by date
        relevanceLanguage: 'en', // Prefer English results
      }, 100) as YouTubeSearchResponse;
      
      // Add unique results
      const queryResults = data.items.map(convertSearchResultToVideoItem);
      queryResults.forEach(video => {
        if (!results.some(existing => existing.id === video.id)) {
          results.push(video);
        }
      });
    }
    
    // Apply additional custom filtering
    const filteredResults = results.filter(video => {
      // Extra filter: videos with these words in title are often Indian music
      const lowerTitle = video.title.toLowerCase();
      const extraFilterKeywords = ['jukebox', 'full album', 'full songs', 'all songs'];
      return !extraFilterKeywords.some(keyword => lowerTitle.includes(keyword));
    });
    
    console.log(`New Releases: Found ${results.length} videos, filtered to ${filteredResults.length}`);
    
    return filteredResults.slice(0, maxResults);
  } catch (error) {
    console.error('Error getting new releases:', error);
    
    // Return fallback data if API fails
    return fallbackNewReleasesData.slice(0, maxResults);
  }
}

const fallbackNewReleasesData: VideoItem[] = [
  {
    id: "p4XSN7VQhCw", // Sabrina Carpenter - Espresso
    title: "Sabrina Carpenter - Espresso",
    channelTitle: "Sabrina Carpenter",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/p4XSN7VQhCw/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "kS1RW_adGxs", // Billie Eilish - LUNCH
    title: "Billie Eilish - LUNCH",
    channelTitle: "Billie Eilish",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/kS1RW_adGxs/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "MlGxz0KIqLM", // Taylor Swift - Fortnight ft. Post Malone
    title: "Taylor Swift - Fortnight ft. Post Malone",
    channelTitle: "Taylor Swift",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/MlGxz0KIqLM/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "eBMCNR76_ns", // MONO - Waiting For You 
    title: "MONO - Waiting For You (Officical Music Video)",
    channelTitle: "MONO OFFICIAL",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/eBMCNR76_ns/hqdefault.jpg"
      }
    },
    regionCode: "VN"
  },
  {
    id: "xmVzreT78O0", // Ariana Grande - we can't be friends
    title: "Ariana Grande - we can't be friends",
    channelTitle: "Ariana Grande",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/xmVzreT78O0/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "gYZcWEwUYvY", // Laufey, Norah Jones - Better Than a Love Song
    title: "Laufey, Norah Jones - Better Than a Love Song",
    channelTitle: "Laufey",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/gYZcWEwUYvY/hqdefault.jpg"
      }
    },
    regionCode: "US"
  },
  {
    id: "vLpqxVtLGQY", // HURRIEWIND - Trap Door
    title: "HURRIEWIND - Trap Door (Official Music Video)",
    channelTitle: "HURRIEWIND Official",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/vLpqxVtLGQY/hqdefault.jpg"
      }
    },
    regionCode: "VN"
  },
  {
    id: "iGmVWqwY6xk", // Lady Gaga - The Chromatica Ball (Live)
    title: "Lady Gaga Presents: The Chromatica Ball (Live from Los Angeles)",
    channelTitle: "Lady Gaga",
    publishedAt: new Date().toISOString(),
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/iGmVWqwY6xk/hqdefault.jpg"
      }
    },
    regionCode: "US"
  }
];

/**
 * Converts a YouTube playlist item to our PlaylistItem format
 */
function convertPlaylistResultToPlaylistItem(item: any): PlaylistItem {
  return {
    id: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnails: item.snippet.thumbnails,
    itemCount: item.contentDetails?.itemCount
  };
}

/**
 * Get playlist info
 */
export async function getPlaylist(playlistId: string): Promise<any> {
  try {
    const playlistData = await fetchFromYouTube('playlists', {
      part: 'snippet,contentDetails',
      id: playlistId,
    });
    
    if (!playlistData.items || playlistData.items.length === 0) {
      throw new Error('Playlist not found');
    }
    
    const playlistItems = await fetchFromYouTube('playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: playlistId,
      maxResults: '50',
    });
    
    const videoIds = playlistItems.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
    
    const videosData = await fetchFromYouTube('videos', {
      part: 'snippet,contentDetails',
      id: videoIds,
    });
    
    return {
      playlist: playlistData.items[0],
      videos: videosData.items.map(convertVideoResultToVideoItem)
    };
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return {
      playlist: null,
      videos: []
    };
  }
}

/**
 * Search for playlists on YouTube
 */
export async function searchPlaylists(query: string, maxResults = 12): Promise<PlaylistItem[]> {
  try {
    const data = await fetchFromYouTube('search', {
      q: query,
      part: 'snippet',
      type: 'playlist',
      maxResults: maxResults.toString(),
    });
    
    return data.items.map((item: any) => ({
      id: item.id.playlistId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnails: item.snippet.thumbnails
    }));
  } catch (error) {
    console.error('Error searching playlists:', error);
    return [];
  }
}

/**
 * Get playlists by channel ID
 */
export async function getChannelPlaylists(channelId: string, maxResults = 12): Promise<PlaylistItem[]> {
  try {
    const data = await fetchFromYouTube('playlists', {
      part: 'snippet,contentDetails',
      channelId: channelId,
      maxResults: maxResults.toString(),
    });
    
    return data.items.map(convertPlaylistResultToPlaylistItem);
  } catch (error) {
    console.error('Error fetching channel playlists:', error);
    return [];
  }
}

/**
 * Get video details by ID
 */
export async function getVideoDetails(videoId: string): Promise<VideoItem | null> {
  try {
    const data = await fetchFromYouTube('videos', {
      part: 'snippet,contentDetails,statistics',
      id: videoId,
    });
    
    if (!data.items || data.items.length === 0) {
      return null;
    }
    
    return convertVideoResultToVideoItem(data.items[0]);
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
}

/**
 * Get music categories/genres
 */
export async function getMusicCategories(regionCode = 'US'): Promise<PlaylistItem[]> {
  try {
    // Getting music playlists from YouTube Music channel
    const data = await fetchFromYouTube('playlists', {
      part: 'snippet,contentDetails',
      channelId: 'UC-9-kyTW8ZkZNDHQJ6FgpwQ', // YouTube Music channel
      maxResults: '20',
    });
    
    return data.items.map(convertPlaylistResultToPlaylistItem);
  } catch (error) {
    console.error('Error fetching music categories:', error);
    return [];
  }
}

/**
 * Get playlist videos
 */
export async function getPlaylistVideos(playlistId: string, maxResults = 12): Promise<VideoItem[]> {
  try {
    const playlistItems = await fetchFromYouTube('playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: playlistId,
      maxResults: maxResults.toString(),
    });
    
    if (!playlistItems.items || playlistItems.items.length === 0) {
      return [];
    }
    
    // Get video IDs from playlist items
    const videoIds = playlistItems.items
      .map((item: any) => item.snippet.resourceId.videoId)
      .join(',');
    
    // Get video details
    const videosData = await fetchFromYouTube('videos', {
      part: 'snippet,contentDetails',
      id: videoIds,
    });
    
    return videosData.items.map(convertVideoResultToVideoItem);
  } catch (error) {
    console.error('Error fetching playlist videos:', error);
    return [];
  }
}

/**
 * Search for music videos on YouTube (by music category)
 */
export async function searchMusic(query: string, maxResults = 12, regionCode = 'US'): Promise<VideoItem[]> {
  try {
    // Clear any existing cache for this query first
    const cachePattern = `search-{"q":"${query}`;
    clearCacheByPattern(cachePattern);
    
    // Try each preferred region in sequence to get diverse results
    let allResults: VideoItem[] = [];
    
    for (const region of PREFERRED_REGIONS) {
      if (allResults.length >= maxResults) break;
      
      const data = await fetchFromYouTube('search', {
        q: query,
        part: 'snippet',
        type: 'video',
        videoCategoryId: '10', // Music category
        videoEmbeddable: 'true',
        maxResults: Math.min(maxResults, 50).toString(),
        regionCode: region
      }, 100) as YouTubeSearchResponse;
      
      const regionResults = data.items.map(item => {
        const videoItem = convertSearchResultToVideoItem(item);
        videoItem.regionCode = region; // Store the region for reference
        return videoItem;
      });
      
      // Add unique results
      regionResults.forEach(video => {
        if (!allResults.some(existing => existing.id === video.id)) {
          allResults.push(video);
        }
      });
    }
    
    return allResults.slice(0, maxResults);
  } catch (error) {
    console.error('Error searching music videos:', error);
    return [];
  }
}

/**
 * Get music videos by category
 */
export async function getMusicByCategory(categoryId: string, maxResults = 12): Promise<VideoItem[]> {
  try {
    const data = await fetchFromYouTube('videos', {
      part: 'snippet',
      chart: 'mostPopular',
      videoCategoryId: categoryId,
      maxResults: maxResults.toString(),
    }) as YouTubeVideosResponse;
    
    return data.items.map(convertVideoResultToVideoItem);
  } catch (error) {
    console.error('Error fetching music by category:', error);
    return fallbackMusicData.slice(0, maxResults);
  }
} 