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
  console.log('🔍 DEBUG: Loading API keys...');
  
  // In Next.js, environment variables are only available at build time on the client
  // unless they start with NEXT_PUBLIC_
  // For client-side safety, we'll use hardcoded keys that match our .env.local
  
  // These keys are already public in the client-side code, so it's safe to hardcode them here
  // They match the keys in .env.local
  const hardcodedKeys = [
    'AIzaSyAZYfQYBlxB7W6aE0NCtBfqzmUoLPG0skA', // Key 1
    'AIzaSyCPmbMqyGzGNRjdKVJQN-vOQkTXwgXbq84', // Key 2
    'AIzaSyDrwVpB2vbwc39CXNKT5ZnSCjYbprcpdec', // Key 3
    'AIzaSyDGx3JVELCdXKFptElE9XbW5mkxVKLVhVM'  // Key 4
  ];
  
  console.log(`🔍 DEBUG: Using ${hardcodedKeys.length} hardcoded API keys`);
  return hardcodedKeys;
};

// Get API keys - we call this function only once at module load time
const API_KEYS = getApiKeysFromEnv();
console.log(`🔑🔑 Loaded ${API_KEYS.length} YouTube API keys: ${API_KEYS.map(key => `${key.substring(0, 8)}...`).join(', ')}`);

// Track API key usage and failures
const keyUsage: Record<string, number> = {};
const keyFailures: Record<string, number> = {};

// Track when a key was last used and when it last failed
const keyLastUsed: Record<string, number> = {};
const keyLastFailed: Record<string, number> = {};
const KEY_COOLDOWN_PERIOD = 60000; // 1 minute cooldown after a key fails

// Track quota status for each key separately rather than globally
const keyQuotaExceeded: Record<string, boolean> = {};

// Initialize quota status for all keys
API_KEYS.forEach(key => {
  keyQuotaExceeded[key] = false;
  keyLastUsed[key] = 0; // Initialize last used time
  keyLastFailed[key] = 0; // Initialize last failed time
});

// Track quota status
let hasQuotaIssues = false;

// Persist key rotation state between server restarts
// This function gets the current key index from storage or defaults to 0
function getCurrentKeyIndex(): number {
  // For server-side code, we need to check if window exists
  if (typeof window !== 'undefined') {
    try {
      const storedIndex = localStorage.getItem('youtubeApiCurrentKeyIndex');
      console.log(`🔍 Checking stored key index: ${storedIndex}`);
      
      if (storedIndex !== null) {
        const index = parseInt(storedIndex, 10);
        // Validate the index is within bounds
        if (!isNaN(index) && index >= 0 && index < API_KEYS.length) {
          console.log(`✅ Using stored key index: ${index} (Key #${index + 1})`);
          return index;
        }
      }
    } catch (error) {
      console.error('Error reading key index from localStorage:', error);
    }
  }
  
  // Default to 0 if we can't get a valid stored index
  console.log(`⚠️ No valid stored key index found, defaulting to 0 (Key #1)`);
  return 0;
}

// Function to save the current key index to persistent storage
function saveCurrentKeyIndex(index: number): void {
  if (typeof window !== 'undefined') {
    try {
      console.log(`💾 Saving key index ${index} (Key #${index + 1}) to localStorage`);
      localStorage.setItem('youtubeApiCurrentKeyIndex', index.toString());
    } catch (error) {
      console.error('Error saving key index to localStorage:', error);
    }
  }
}

// Load persisted quota status
function loadQuotaStatus(): void {
  // First, initialize all keys as NOT having quota issues
  API_KEYS.forEach(key => {
    keyQuotaExceeded[key] = false;
  });
  
  if (typeof window !== 'undefined') {
    try {
      const storedStatus = localStorage.getItem('youtubeApiQuotaStatus');
      if (storedStatus) {
        const parsedStatus = JSON.parse(storedStatus);
        
        // Validate and apply the stored quota status
        if (parsedStatus && typeof parsedStatus === 'object') {
          // Apply to our in-memory status
          Object.keys(parsedStatus).forEach(key => {
            if (API_KEYS.includes(key)) {
              keyQuotaExceeded[key] = Boolean(parsedStatus[key]);
            }
          });
          
          console.log('📊 Loaded persisted quota status:', keyQuotaExceeded);
          
          // Update global quota status based on loaded data
          hasQuotaIssues = API_KEYS.length > 0 && API_KEYS.every(key => keyQuotaExceeded[key] === true);
          
          // Debug log to show the status of each key
          logKeyStatus();
        }
      }
      
      // Also load key usage history if available
      const storedKeyHistory = localStorage.getItem('youtubeApiKeyHistory');
      if (storedKeyHistory) {
        try {
          const history = JSON.parse(storedKeyHistory);
          if (history && typeof history === 'object') {
            if (history.lastUsed) Object.assign(keyLastUsed, history.lastUsed);
            if (history.lastFailed) Object.assign(keyLastFailed, history.lastFailed);
            console.log('📊 Loaded key usage history');
          }
        } catch (e) {
          console.error('Error parsing key history:', e);
        }
      }
    } catch (error) {
      console.error('Error loading quota status from localStorage:', error);
      // If there's an error loading the status, reset all keys to ensure they're usable
      forceResetAllKeys();
    }
  }
}

// Function to log the current status of all keys for debugging
function logKeyStatus(): void {
  console.log('🔍 CURRENT KEY STATUS:');
  API_KEYS.forEach((key, index) => {
    const lastUsed = keyLastUsed[key] ? new Date(keyLastUsed[key]).toLocaleTimeString() : 'never';
    const lastFailed = keyLastFailed[key] ? new Date(keyLastFailed[key]).toLocaleTimeString() : 'never';
    console.log(`Key #${index + 1} (${key.substring(0, 8)}...): ${keyQuotaExceeded[key] ? '🚫 QUOTA EXCEEDED' : '✅ OK'} | Last used: ${lastUsed} | Last failed: ${lastFailed}`);
  });
  console.log(`Global quota issues: ${hasQuotaIssues ? '🚫 YES' : '✅ NO'}`);
}

// Save quota status and key history to localStorage
function saveQuotaStatus(): void {
  if (typeof window !== 'undefined') {
    try {
      // Create a record that maps each API key to its quota status
      const statusToSave: Record<string, boolean> = {};
      API_KEYS.forEach(key => {
        statusToSave[key] = Boolean(keyQuotaExceeded[key]);
      });
      
      // Save the record to localStorage
      localStorage.setItem('youtubeApiQuotaStatus', JSON.stringify(statusToSave));
      
      // Also save key usage history
      const keyHistory = {
        lastUsed: keyLastUsed,
        lastFailed: keyLastFailed
      };
      localStorage.setItem('youtubeApiKeyHistory', JSON.stringify(keyHistory));
      
      console.log('📊 Saved quota status and key history to localStorage');
    } catch (error) {
      console.error('Error saving quota status to localStorage:', error);
    }
  }
}

// Function to manually clear localStorage quota status
export function clearQuotaStatus(): void {
  console.log('🧹 Clearing quota status from localStorage');
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('youtubeApiQuotaStatus');
      localStorage.removeItem('youtubeApiCurrentKeyIndex');
      localStorage.removeItem('youtubeApiKeyHistory');
      
      // Reset in-memory status
      API_KEYS.forEach(key => {
        keyQuotaExceeded[key] = false;
        keyLastFailed[key] = 0;
      });
      
      hasQuotaIssues = false;
      // MODIFIED: Don't reset currentKeyIndex since we're manually using the third key
      // currentKeyIndex = 0;
      
      console.log('✅ Quota status cleared successfully');
      logKeyStatus();
    } catch (error) {
      console.error('Error clearing quota status from localStorage:', error);
    }
  }
}

// Start with the persisted key index or the first key (index 0)
let currentKeyIndex = getCurrentKeyIndex();
console.log(`🚀 STARTING WITH YouTube API KEY #${currentKeyIndex + 1} of ${API_KEYS.length} keys`);

// Load any persisted quota status
loadQuotaStatus();

/**
 * Get the best available API key, considering failures and cooldown periods
 */
function getApiKey(): string {
  // If we have a current key index that's valid, use it
  if (currentKeyIndex >= 0 && currentKeyIndex < API_KEYS.length) {
    const currentKey = API_KEYS[currentKeyIndex];
    
    // Check if the current key is in a cooldown period after failure
    const lastFailedTime = keyLastFailed[currentKey] || 0;
    const timeSinceFailure = Date.now() - lastFailedTime;
    
    // If the key is not in cooldown and not marked as quota exceeded, use it
    if (timeSinceFailure > KEY_COOLDOWN_PERIOD && !keyQuotaExceeded[currentKey]) {
      console.log(`🔑 Using current key #${currentKeyIndex + 1}`);
      keyLastUsed[currentKey] = Date.now();
      return currentKey;
    }
    
    // Current key is in cooldown or has quota issues, need to rotate
    console.log(`⚠️ Current key #${currentKeyIndex + 1} is in cooldown or has quota issues, rotating...`);
  }
  
  // Find the best available key
  let bestKeyIndex = -1;
  let oldestUseTime = Infinity;
  
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = API_KEYS[i];
    
    // Skip keys with quota exceeded
    if (keyQuotaExceeded[key]) {
      continue;
    }
    
    // Check if the key is in cooldown period after a failure
    const lastFailedTime = keyLastFailed[key] || 0;
    const timeSinceFailure = Date.now() - lastFailedTime;
    if (timeSinceFailure <= KEY_COOLDOWN_PERIOD) {
      continue;
    }
    
    // Find the least recently used key
    const lastUsedTime = keyLastUsed[key] || 0;
    if (lastUsedTime < oldestUseTime) {
      oldestUseTime = lastUsedTime;
      bestKeyIndex = i;
    }
  }
  
  // If we found a usable key, update the current key index
  if (bestKeyIndex !== -1) {
    if (bestKeyIndex !== currentKeyIndex) {
      console.log(`🔄 Rotating from key #${currentKeyIndex + 1} to key #${bestKeyIndex + 1}`);
      setCurrentApiKeyIndex(bestKeyIndex);
    }
    
    const key = API_KEYS[bestKeyIndex];
    keyLastUsed[key] = Date.now();
    saveQuotaStatus(); // Save the updated usage time
    return key;
  }
  
  // If all keys are in cooldown or have quota issues, use the one with the oldest failure
  let leastRecentlyFailedIndex = 0;
  let oldestFailureTime = 0;
  
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = API_KEYS[i];
    
    // Skip keys with quota exceeded
    if (keyQuotaExceeded[key]) {
      continue;
    }
    
    const lastFailedTime = keyLastFailed[key] || 0;
    if (lastFailedTime > oldestFailureTime) {
      oldestFailureTime = lastFailedTime;
      leastRecentlyFailedIndex = i;
    }
  }
  
  // If we found a key that failed but is not quota exceeded, use it
  if (oldestFailureTime > 0) {
    console.log(`⚠️ All keys are in cooldown, using least recently failed key #${leastRecentlyFailedIndex + 1}`);
    setCurrentApiKeyIndex(leastRecentlyFailedIndex);
    const key = API_KEYS[leastRecentlyFailedIndex];
    keyLastUsed[key] = Date.now();
    saveQuotaStatus(); // Save the updated usage time
    return key;
  }
  
  // If all keys have quota exceeded, use the first one as a fallback
  console.log(`❌ All keys have quota issues, using key #1 as fallback`);
  setCurrentApiKeyIndex(0);
  return API_KEYS[0];
}

/**
 * Mark a key as failed, with improved tracking
 */
function markKeyAsFailed(key: string, isQuotaExceeded: boolean = false): void {
  // Record the failure time
  keyLastFailed[key] = Date.now();
  
  // Update failure count
  keyFailures[key] = (keyFailures[key] || 0) + 1;
  
  // If this is a quota exceeded error, mark it accordingly
  if (isQuotaExceeded) {
    keyQuotaExceeded[key] = true;
    console.log(`🚫 API key ${key.substring(0, 8)}... marked as quota exceeded`);
  } else {
    console.log(`❌ API key ${key.substring(0, 8)}... marked as failed. Failures: ${keyFailures[key]}`);
  }
  
  // Save the updated status
  saveQuotaStatus();
  
  // If the failed key is the current key, rotate to a new one
  if (key === API_KEYS[currentKeyIndex]) {
    console.log(`🔄 Current key failed, rotating to next available key...`);
    forceKeyRotation();
  }
}

// Function to track key usage
function trackKeyUsage(key: string, quota: number = 1): void {
  if (!keyUsage[key]) {
    keyUsage[key] = quota;
  } else {
    keyUsage[key] += quota;
  }
  // Add a periodic log of which key is being used
  if (keyUsage[key] % 5 === 0) {
    console.log(`📊 Key #${currentKeyIndex + 1} has been used ${keyUsage[key]} times`);
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

/**
 * Test all API keys to check their validity and quota status
 * This is useful for debugging when keys aren't working
 */
export async function testAllApiKeys(): Promise<void> {
  console.log("🧪 TESTING ALL API KEYS");
  
  // Save the original key index so we can restore it
  const originalKeyIndex = currentKeyIndex;
  
  // Test each key with a simple request
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = API_KEYS[i];
    console.log(`\n🔑 Testing key #${i+1}: ${key.substring(0, 8)}...`);
    
    try {
      // Make a minimal request to check the key
      const url = `${API_BASE_URL}/videos?part=id&chart=mostPopular&maxResults=1&key=${key}`;
      console.log(`🌐 Making test request to: ${url.replace(key, 'API_KEY_HIDDEN')}`);
      
      const response = await fetch(url);
      
      if (response.ok) {
        console.log(`✅ Key #${i+1} is VALID and has available quota`);
        keyQuotaExceeded[key] = false;
        keyFailures[key] = 0;
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: 'Could not parse error' } }));
        
        if (response.status === 403) {
          // Check if this is a quota issue
          const isQuotaExceeded = Boolean(
            errorData.error?.errors?.some((e: any) => 
              e.reason === 'quotaExceeded' || 
              e.reason === 'dailyLimitExceeded' ||
              e.reason === 'rateLimitExceeded'
            ) ||
            (errorData.error?.message && (
              errorData.error.message.includes('quota') ||
              errorData.error.message.includes('limit')
            ))
          );
          
          if (isQuotaExceeded) {
            console.log(`🚫 Key #${i+1} has EXCEEDED QUOTA`);
            keyQuotaExceeded[key] = true;
          } else {
            console.log(`❌ Key #${i+1} returned 403 error but NOT quota related: ${JSON.stringify(errorData.error || {})}`);
          }
        } else if (response.status === 400) {
          console.log(`❌ Key #${i+1} is INVALID or has a format issue: ${JSON.stringify(errorData.error || {})}`);
        } else {
          console.log(`❌ Key #${i+1} returned error ${response.status}: ${JSON.stringify(errorData.error || {})}`);
        }
      }
    } catch (error) {
      console.log(`❌ Key #${i+1} test failed with error: ${error}`);
    }
  }
  
  // Restore the original key index
  currentKeyIndex = originalKeyIndex;
  
  // Save the updated quota status
  saveQuotaStatus();
  
  // Log the final status of all keys
  console.log("\n🔍 FINAL KEY STATUS AFTER TESTING:");
  logKeyStatus();
  
  console.log("\nAPI key testing complete");
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
// Increase cache durations
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour default cache (was 15 minutes)
const EXTENDED_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for when we have quota issues (was 12 hours)

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
  // Ensure all keys have defined quota status before checking
  API_KEYS.forEach(k => {
    if (keyQuotaExceeded[k] === undefined) {
      keyQuotaExceeded[k] = false;
    }
  });
  
  // Update the global hasQuotaIssues flag based on key status - ONLY if ALL keys have quota issues
  hasQuotaIssues = API_KEYS.length > 0 && API_KEYS.every(key => keyQuotaExceeded[key] === true);
  
  // Log the current status of all keys for debugging
  if (hasQuotaIssues) {
    console.log('🔴 ALL keys have quota issues:');
    API_KEYS.forEach((k, i) => {
      console.log(`  - Key #${i+1}: ${keyQuotaExceeded[k] ? '🚫 QUOTA EXCEEDED' : 'OK'}`);
    });
  } else {
    console.log('🟢 At least one key is still available');
    API_KEYS.forEach((k, i) => {
      console.log(`  - Key #${i+1}: ${keyQuotaExceeded[k] ? '🚫 QUOTA EXCEEDED' : 'OK'}`);
    });
  }
  
  return hasQuotaIssues;
}

/**
 * Reset all key statuses - this can be useful if keys were incorrectly marked as failed
 */
export function resetAllKeyStatuses(): void {
  console.log('🔄 RESETTING ALL KEY STATUSES');
  
  // Reset all failure counts
  Object.keys(keyFailures).forEach(key => {
    keyFailures[key] = 0;
  });
  
  // Reset all quota exceeded flags
  API_KEYS.forEach(key => {
    keyQuotaExceeded[key] = false;
  });
  
  // Reset global quota issues flag
  hasQuotaIssues = false;
  
  // Start from the first key again
  currentKeyIndex = 0;
  saveCurrentKeyIndex(currentKeyIndex);
  
  // Also clear any persisted quota status in localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('youtubeApiQuotaStatus');
    } catch (error) {
      console.error('Error clearing quota status from localStorage:', error);
    }
  }
  
  // Log the updated status
  logKeyStatus();
  
  console.log(`✅ All key statuses have been reset. Starting with key #1 again.`);
}

/**
 * Force rotation to the next available API key
 * This can be called externally when we know a key is having issues
 */
export function forceKeyRotation(): void {
  if (API_KEYS.length <= 1) {
    console.log('⚠️ Cannot rotate keys - only one key available');
    return;
  }
  
  // Log the current key before rotation
  console.log(`🔑 BEFORE ROTATION: Currently using key #${currentKeyIndex + 1} of ${API_KEYS.length}`);
  
  const oldKeyIndex = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  
  // Make this log more visible
  console.log(`\n🔄🔄🔄 KEY ROTATION 🔄🔄🔄`);
  console.log(`🔄 FORCED KEY ROTATION: Moving from Key #${oldKeyIndex + 1} to Key #${currentKeyIndex + 1}`);
  
  // Save the updated index to localStorage
  saveCurrentKeyIndex(currentKeyIndex);
  console.log(`💾 Saved new key index to localStorage: ${currentKeyIndex} (Key #${currentKeyIndex + 1})`);
  
  // Reset quota status for the new key
  const key = API_KEYS[currentKeyIndex];
  if (key) {
    keyQuotaExceeded[key] = false;
    console.log(`✅ Reset quota status for new Key #${currentKeyIndex + 1}`);
  }
  
  console.log(`🔑 NOW USING YouTube API key #${currentKeyIndex + 1}/${API_KEYS.length}: ${key ? key.substring(0, 8) : 'undefined'}...`);
  console.log(`🔄🔄🔄 END KEY ROTATION 🔄🔄🔄\n`);
  
  // Log all key statuses
  console.log(`🔑🔑 KEYS STATUS UPDATE AFTER FORCED ROTATION 🔑🔑`);
  API_KEYS.forEach((k, i) => {
    console.log(`Key #${i+1}: ${keyQuotaExceeded[k] ? '🚫 QUOTA EXCEEDED' : `${keyFailures[k] || 0} failures`} - ${currentKeyIndex === i ? '✅ CURRENT' : ''}`);
  });
  
  // Update the global quota status
  hasQuotaIssues = API_KEYS.length > 0 && API_KEYS.every(key => keyQuotaExceeded[key] === true);
  saveQuotaStatus();
  
  // Force an API call to test the new key
  console.log(`🧪 Testing the new key with a minimal API call...`);
  setTimeout(async () => {
    try {
      // Make a minimal request to check the key
      const key = API_KEYS[currentKeyIndex];
      const url = `${API_BASE_URL}/videos?part=id&chart=mostPopular&maxResults=1&key=${key}`;
      console.log(`🌐 Making test request with new key #${currentKeyIndex + 1}`);
      
      const response = await fetch(url);
      
      if (response.ok) {
        console.log(`✅ New key #${currentKeyIndex + 1} is working correctly!`);
      } else {
        console.log(`❌ New key #${currentKeyIndex + 1} returned error ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error testing new key:`, error);
    }
  }, 500);
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

// Add a request queue system to prevent too many simultaneous API calls
const requestQueue: Array<() => Promise<any>> = [];
let isProcessingQueue = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 300; // Minimum time between requests in ms
const MAX_RETRIES = 2; // Maximum number of retries for a failed request
const RETRY_DELAY = 1000; // Delay between retries in ms

// Process the request queue one at a time with rate limiting
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  try {
    // Implement rate limiting
    const now = Date.now();
    const timeElapsed = now - lastRequestTime;
    if (timeElapsed < MIN_REQUEST_INTERVAL) {
      // Wait until we've reached the minimum interval
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeElapsed));
    }
    
    // Get the next request from the queue
    const request = requestQueue.shift();
    if (request) {
      console.log(`🔄 Processing request from queue (${requestQueue.length} remaining)`);
      lastRequestTime = Date.now();
      await request();
    }
  } catch (error) {
    console.error('Error processing request from queue:', error);
  } finally {
    isProcessingQueue = false;
    
    // Process the next request in the queue
    if (requestQueue.length > 0) {
      processQueue();
    } else {
      console.log('✅ Request queue is empty');
    }
  }
}

// Add a request to the queue with retry logic
function addToQueue<T>(request: () => Promise<T>, retryCount = 0): Promise<T> {
  return new Promise((resolve, reject) => {
    const wrappedRequest = async () => {
      try {
        const result = await request();
        resolve(result);
      } catch (error: any) {
        // Check if we should retry
        if (retryCount < MAX_RETRIES && shouldRetry(error)) {
          console.log(`⚠️ Request failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          // Wait before retrying
          setTimeout(() => {
            addToQueue(request, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, RETRY_DELAY);
        } else {
          console.error(`❌ Request failed after ${retryCount} retries:`, error);
          reject(error);
        }
      }
    };
    
    requestQueue.push(wrappedRequest);
    
    // Start processing the queue if it's not already being processed
    if (!isProcessingQueue) {
      processQueue();
    }
  });
}

// Determine if an error should trigger a retry
function shouldRetry(error: any): boolean {
  // Retry on network errors or 5xx server errors
  if (!error.status) return true; // Network error
  
  const status = typeof error.status === 'number' ? error.status : parseInt(error.status);
  
  // Don't retry on quota exceeded (403) or invalid requests (400)
  if (status === 403 || status === 400) return false;
  
  // Retry on server errors (500, 502, 503, 504)
  return status >= 500 && status < 600;
}

/**
 * Fetches data from YouTube API with caching, key rotation, and improved error handling
 */
async function fetchFromYouTube(endpoint: string, params: Record<string, string>, quotaCost: number = 1): Promise<any> {
  // Use the request queue for all API calls
  return addToQueue(async () => {
    // Check if all keys have quota issues - do this first
    // Ensure all keys have defined quota status before checking
    API_KEYS.forEach(k => {
      if (keyQuotaExceeded[k] === undefined) {
        console.log(`⚠️ Key ${k.substring(0, 8)}... had undefined quota status. Setting to false.`);
        keyQuotaExceeded[k] = false;
      }
    });
    
    // Log the current status of all keys before checking
    console.log('🔍 CHECKING KEY STATUS BEFORE API CALL:');
    API_KEYS.forEach((key, index) => {
      console.log(`Key #${index + 1} (${key.substring(0, 8)}...): ${keyQuotaExceeded[key] ? '🚫 QUOTA EXCEEDED' : '✅ OK'}`);
    });
    
    const allKeysQuotaExceeded = API_KEYS.length > 0 && API_KEYS.every(key => keyQuotaExceeded[key] === true);
    if (allKeysQuotaExceeded) {
      console.error('⛔ ALL API KEYS HAVE QUOTA ISSUES. Using fallback content.');
      console.error('⚠️ This might be incorrect. Attempting to reset key #3 to try it anyway...');
      
      // Force the third key to be usable if we have at least 3 keys
      if (API_KEYS.length >= 3) {
        const thirdKey = API_KEYS[2]; // Index 2 is the third key
        keyQuotaExceeded[thirdKey] = false;
        console.log(`🔄 Forced key #3 (${thirdKey.substring(0, 8)}...) to be usable`);
        
        // Set current key index to use the third key
        currentKeyIndex = 2;
        saveCurrentKeyIndex(currentKeyIndex);
        console.log(`🔄 Set current key index to #3`);
        
        // Update global quota status
        hasQuotaIssues = false;
        saveQuotaStatus();
        
        // Continue with the API call using the third key
        return fetchFromYouTube(endpoint, params, quotaCost);
      }
      
      hasQuotaIssues = true;
      saveQuotaStatus(); // Persist the quota status
      return { items: [] }; // Return empty results
    }
    
    // Force any keys with quota issues to be skipped
    const currentKey = API_KEYS[currentKeyIndex];
    if (currentKey && keyQuotaExceeded[currentKey]) {
      console.log(`⚠️ Key #${currentKeyIndex + 1} has quota issues, rotating to next available key.`);
      
      // Find the next key that doesn't have quota issues
      let nextKeyFound = false;
      let originalKeyIndex = currentKeyIndex;
      
      for (let i = 0; i < API_KEYS.length; i++) {
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        saveCurrentKeyIndex(currentKeyIndex); // Save the updated index
        
        if (!keyQuotaExceeded[API_KEYS[currentKeyIndex]]) {
          nextKeyFound = true;
          console.log(`✅ Found available key #${currentKeyIndex + 1}`);
          break;
        }
      }
      
      // If we couldn't find a key without quota issues, reset to original and use fallback
      if (!nextKeyFound) {
        currentKeyIndex = originalKeyIndex;
        saveCurrentKeyIndex(currentKeyIndex); // Save the index
        console.error('⛔ NO AVAILABLE KEYS FOUND AFTER ROTATION. Using fallback content.');
        hasQuotaIssues = true;
        saveQuotaStatus(); // Persist the quota status
        return { items: [] };
      }
      
      // Try again with the new key
      return fetchFromYouTube(endpoint, params, quotaCost);
    }
    
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
      console.log(`🌐 Fetching from YouTube API: ${endpoint} using key #${currentKeyIndex + 1} (${apiKey.substring(0, 8)}...)`);
      console.log(`🔍 Full URL: ${API_BASE_URL}/${endpoint}?${queryParams.replace(apiKey, 'API_KEY_HIDDEN')}`);
      
      // Add more prominent logging for keys #3 and #4
      if (currentKeyIndex === 2 || currentKeyIndex === 3) {
        console.log(`\n`);
        console.log(`🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑`);
        console.log(`🔑 API CALL USING ${currentKeyIndex === 2 ? 'THIRD' : 'FOURTH'} KEY (#${currentKeyIndex + 1})`);
        console.log(`🔑 ENDPOINT: ${endpoint}`);
        console.log(`🔑 QUOTA COST: ${quotaCost} units`);
        console.log(`🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑`);
        console.log(`\n`);
      }
      
      const startTime = performance.now();
      const response = await fetch(url);
      const endTime = performance.now();
      
      console.log(`⏱️ ${endpoint} request took ${(endTime - startTime).toFixed(0)}ms with key #${currentKeyIndex + 1}`);
      
      if (!response.ok) {
        // If we get a 403 error, it might be quota exceeded
        if (response.status === 403) {
          console.error(`❌ HTTP 403 error from YouTube API with key #${currentKeyIndex + 1}`);
          
          let isQuotaExceeded = false;
          let errorDetails = "";
          
          try {
            // Parse the error response to check if it's explicitly a quota issue
            const errorData = await response.json();
            errorDetails = JSON.stringify(errorData.error || {});
            
            isQuotaExceeded = Boolean(
              errorData.error?.errors?.some((e: any) => 
                e.reason === 'quotaExceeded' || 
                e.reason === 'dailyLimitExceeded' ||
                e.reason === 'rateLimitExceeded'
              ) ||
              (errorData.error?.message && (
                errorData.error.message.includes('quota') ||
                errorData.error.message.includes('limit')
              ))
            );
            
            if (isQuotaExceeded) {
              console.error(`🚫 CONFIRMED QUOTA EXCEEDED FOR KEY #${currentKeyIndex + 1}`);
              // Immediately mark this key as having quota issues
              keyQuotaExceeded[apiKey] = true;
              saveQuotaStatus(); // Persist the updated quota status
            }
            
            console.log(`Error details: ${errorDetails}`);
          } catch (e) {
            // If we can't parse the JSON, assume it's a quota issue anyway for 403 errors
            console.error('Failed to parse error response:', e);
            isQuotaExceeded = true; // Assume quota issue for 403 errors we can't parse
            keyQuotaExceeded[apiKey] = true;
            saveQuotaStatus(); // Persist the updated quota status
          }
          
          // Mark the current key as failed
          markKeyAsFailed(apiKey, isQuotaExceeded);
          
          // Try cache even if expired
          if (cache[cacheKey]) {
            console.log('🔄 Using expired cache as fallback due to API error');
            return cache[cacheKey].data;
          }
          
          // If the key index changed after marking as failed, retry with the new key
          console.log(`🔄 Retrying request with key #${currentKeyIndex + 1}`);
          return fetchFromYouTube(endpoint, params, quotaCost);
          
          // If we got here, there was an error but not quota related
          throw new Error(`YouTube API error: ${response.status} ${errorDetails}`);
        }
        
        // Handle 400 Bad Request errors - these could be due to invalid API keys or parameters
        if (response.status === 400) {
          console.error(`❌ HTTP 400 Bad Request error from YouTube API with key #${currentKeyIndex + 1}`);
          
          let errorDetails = "";
          let isInvalidKey = false;
          
          try {
            // Parse the error response to check if it's related to an invalid key
            const errorData = await response.json();
            errorDetails = JSON.stringify(errorData.error || {});
            
            // Check if this is an API key issue
            isInvalidKey = Boolean(
              errorData.error?.errors?.some((e: any) => 
                e.reason === 'badRequest' || 
                e.reason === 'invalid' ||
                e.reason === 'keyInvalid'
              ) ||
              (errorData.error?.message && (
                errorData.error.message.includes('key') ||
                errorData.error.message.includes('API key')
              ))
            );
            
            console.log(`Error details: ${errorDetails}`);
            
            if (isInvalidKey) {
              console.error(`🚫 INVALID API KEY DETECTED: Key #${currentKeyIndex + 1}`);
              // Fixed: Store the old key index before marking as failed
              const oldKeyIndex = currentKeyIndex;
              markKeyAsFailed(apiKey, false);
              
              // Try cache even if expired
              if (cache[cacheKey]) {
                console.log('🔄 Using expired cache as fallback due to invalid key');
                return cache[cacheKey].data;
              }
              
              // Retry with a different key if the key index changed
              if (oldKeyIndex !== currentKeyIndex) {
                console.log(`🔄 Retrying request with a different key due to invalid key`);
                return fetchFromYouTube(endpoint, params, quotaCost);
              }
            }
          } catch (e) {
            console.error('Failed to parse error response:', e);
            // Even if we can't parse the error, mark the key as failed
            const oldKeyIndex = currentKeyIndex;
            markKeyAsFailed(apiKey, false);
            
            // Try cache even if expired
            if (cache[cacheKey]) {
              console.log('🔄 Using expired cache as fallback due to API error');
              return cache[cacheKey].data;
            }
            
            // Retry with a different key if the key index changed
            if (oldKeyIndex !== currentKeyIndex) {
              console.log(`🔄 Retrying request with a different key after 400 error`);
              return fetchFromYouTube(endpoint, params, quotaCost);
            }
          }
        }
        
        // For any other error, log it and throw
        console.error(`❌ YouTube API error: ${response.status} ${response.statusText}`);
        console.error(`Request URL: ${API_BASE_URL}/${endpoint}?${queryParams.replace(apiKey, 'API_KEY_HIDDEN')}`);
        
        // Mark the key as failed for any error
        markKeyAsFailed(apiKey, false);
        
        // Try cache even if expired for any error
        if (cache[cacheKey]) {
          console.log('🔄 Using expired cache as fallback due to API error');
          return cache[cacheKey].data;
        }
        
        // Retry with a different key for any error
        console.log(`🔄 Retrying request with a different key after error`);
        return fetchFromYouTube(endpoint, params, quotaCost);
      }
      
      // If we got here, the request was successful, so we're not having quota issues
      // for the current key
      keyQuotaExceeded[apiKey] = false;
      saveQuotaStatus(); // Persist the updated quota status
      
      // Also reset the failure count for this key since it worked
      keyFailures[apiKey] = 0;
      
      // Re-check the global quota status after this successful call
      checkQuotaStatus();
      
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
      const isQuotaError = error instanceof Error && error.message.includes('quota');
      
      // Mark the key as failed with appropriate quota status
      markKeyAsFailed(apiKey, isQuotaError);
      
      // Update quota status if it's a quota error
      if (isQuotaError) {
        keyQuotaExceeded[apiKey] = true;
        saveQuotaStatus(); // Persist the updated quota status
      }
      
      // Try to return cached data even if expired
      if (cache[cacheKey]) {
        console.log('🔄 Using expired cache as fallback due to error');
        return cache[cacheKey].data;
      }
      
      // Try again with a new key
      console.log(`🔄 Retrying request with key #${currentKeyIndex + 1} after error`);
      return fetchFromYouTube(endpoint, params, quotaCost);
    }
  });
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
    // Check if we need to force key rotation
    if (hasQuotaIssues) {
      // Try to force rotation if we have more than one key
      if (API_KEYS.length > 1) {
        forceKeyRotation();
      }
    }
    
    // If we're still having quota issues after trying rotation, use fallback data
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

/**
 * Force reset all keys to ensure they're properly initialized and usable
 * This is more aggressive than resetAllKeyStatuses as it also clears localStorage
 */
export function forceResetAllKeys(): void {
  console.log('🔄 FORCE RESETTING ALL KEYS');
  
  // Reset all failure counts
  Object.keys(keyFailures).forEach(key => {
    keyFailures[key] = 0;
  });
  
  // Reset all quota exceeded flags - explicitly set each key
  API_KEYS.forEach(key => {
    keyQuotaExceeded[key] = false;
  });
  
  // Reset global quota issues flag
  hasQuotaIssues = false;
  
  // Start from the first key again
  const oldKeyIndex = currentKeyIndex;
  currentKeyIndex = 0;
  console.log(`🔄 Resetting key index from #${oldKeyIndex + 1} to #1`);
  
  // Clear any persisted quota status in localStorage
  if (typeof window !== 'undefined') {
    try {
      console.log('🧹 Clearing quota status from localStorage');
      localStorage.removeItem('youtubeApiQuotaStatus');
      
      console.log('🧹 Clearing key index from localStorage');
      localStorage.removeItem('youtubeApiCurrentKeyIndex');
      
      // Save the new key index (0) to localStorage
      saveCurrentKeyIndex(currentKeyIndex);
      
      console.log('✅ Cleared quota status and key index from localStorage');
    } catch (error) {
      console.error('Error clearing quota status from localStorage:', error);
    }
  }
  
  // Log the updated status
  logKeyStatus();
  
  console.log(`✅ All keys have been force reset. Starting with key #1 again.`);
}

// Add a function to manually set the current key index
export function setCurrentApiKeyIndex(index: number): void {
  if (index < 0 || index >= API_KEYS.length) {
    console.error(`❌ Invalid key index: ${index}. Must be between 0 and ${API_KEYS.length - 1}`);
    return;
  }
  
  // Make the logs more prominent with repeated symbols
  console.log(`\n`);
  console.log(`🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑`);
  console.log(`🔑🔑🔑 MANUALLY SWITCHING TO API KEY #${index + 1} 🔑🔑🔑`);
  console.log(`🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑`);
  console.log(`\n`);
  console.log(`🔄 Changing from Key #${currentKeyIndex + 1} to Key #${index + 1}`);
  
  currentKeyIndex = index;
  saveCurrentKeyIndex(currentKeyIndex);
  
  // Reset quota status for this key
  const key = API_KEYS[currentKeyIndex];
  if (key) {
    keyQuotaExceeded[key] = false;
    keyFailures[key] = 0;
    console.log(`✅ Reset quota status for Key #${currentKeyIndex + 1}`);
    
    // Add more prominent logging for the key being used
    console.log(`\n`);
    console.log(`🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑`);
    console.log(`🔑 NOW ACTIVELY USING YOUTUBE API KEY #${currentKeyIndex + 1}: ${key.substring(0, 12)}...`);
    console.log(`🔑 THIS IS ${currentKeyIndex === 2 ? 'THE THIRD' : currentKeyIndex === 3 ? 'THE FOURTH' : currentKeyIndex === 1 ? 'THE SECOND' : 'THE FIRST'} KEY IN THE ROTATION`);
    console.log(`🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑🔑`);
    console.log(`\n`);
  }
  
  // Update global quota status
  hasQuotaIssues = API_KEYS.length > 0 && API_KEYS.every(key => keyQuotaExceeded[key] === true);
  saveQuotaStatus();
  
  // Log all key statuses
  logKeyStatus();
  
  console.log(`\n🔄🔄🔄 KEY SWITCH COMPLETE - NOW USING KEY #${index + 1} 🔄🔄🔄\n`);
} 