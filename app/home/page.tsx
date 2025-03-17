"use client"

import { useEffect, useState, useCallback } from 'react';
import MusicSection from '../components/sections/MusicSection';
import AlbumCard from '../components/ui/AlbumCard';
import CategoryBar from '../components/ui/CategoryBar'; 
import QuotaAlert from '../components/ui/QuotaAlert';
import { 
  getTrendingMusic, 
  getNewReleases, 
  getMoodVideos,
  getRelatedVideos,
  searchVideos, 
  VideoItem,
  logApiUsageStats,
  clearCacheByPattern,
  checkQuotaStatus
} from '../lib/utils/youtube-api';
import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

// Number of items to display per section
const ITEMS_PER_SECTION = 6;
// Reduce fetch results to minimize API quota usage
const MAX_FETCH_RESULTS = 25; // Reduced from 50 to 25

// Add typings for our global fetch state
declare global {
  interface Window {
    _isFetchingHomeData?: boolean;
  }
}

export default function HomePage() {
  const [userName, setUserName] = useState('Duy');
  const [isLoading, setIsLoading] = useState(true);
  const [quotaError, setQuotaError] = useState(false);
  
  // Log renders to help debug infinite loop issues
  console.log('HomePage render', { isLoading });
  
  // Add a render counter for debugging
  const renderCount = React.useRef(0);
  renderCount.current += 1;
  
  // If we're rendering too many times, it might indicate an infinite loop
  if (renderCount.current > 50) {
    console.error(`Too many renders (${renderCount.current}), possible infinite loop detected`);
    // Emergency fallback to prevent browser tab from freezing
    if (renderCount.current > 100) {
      return <div className="p-5 text-red-500">Error: Render loop detected. Please refresh the page.</div>;
    }
  }
  
  // State for all video categories
  const [trendingVideos, setTrendingVideos] = useState<VideoItem[]>([]);
  const [newReleases, setNewReleases] = useState<VideoItem[]>([]);
  const [isLoadingNewReleases, setIsLoadingNewReleases] = useState<boolean>(false);
  const [listenAgainVideos, setListenAgainVideos] = useState<VideoItem[]>([]);
  const [podcastVideos, setPodcastVideos] = useState<VideoItem[]>([]);
  const [focusVideos, setFocusVideos] = useState<VideoItem[]>([]);
  const [workoutVideos, setWorkoutVideos] = useState<VideoItem[]>([]);
  
  // Additional category data that we'll get from our API calls
  const [chillVideos, setChillVideos] = useState<VideoItem[]>([]);
  const [partyVideos, setPartyVideos] = useState<VideoItem[]>([]);
  
  // Add a debounce mechanism to prevent multiple rapid refreshes
  const [isRefreshDebounced, setIsRefreshDebounced] = useState(false);
  
  // Make fetchData available to other functions via useCallback
  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setIsLoading(true);
    }
    
    // Avoid duplicate fetches - this helps prevent potential loops
    if (window._isFetchingHomeData) {
      console.log('Already fetching data, skipping duplicate fetch');
      return;
    }
    
    window._isFetchingHomeData = true;
    
    console.time('fetchData');
    console.log(`🚀 Starting data fetch (background: ${isBackgroundRefresh})`);
    
    try {
      // Group API calls that use the same quota cost (100 units each for search)
      const [moodResponse, otherResponse] = await Promise.all([
        // Get all mood categories in one batch (max 50 results)
        fetchMoodCategories(),
        // Get other data (trending, new releases, etc.)
        fetchOtherCategories()
      ]);
      
      // Reset quota error state if successful
      setQuotaError(false);
      
      // Process mood response - batch all state updates together to reduce renders
      const stateUpdates = () => {
        setFocusVideos(moodResponse.focus || []);
        setWorkoutVideos(moodResponse.workout || []);
        setChillVideos(moodResponse.chill || []);
        setPartyVideos(moodResponse.party || []);
        
        // Process other response
        setTrendingVideos(otherResponse.trending || []);
        setNewReleases(otherResponse.newReleases || []);
        setListenAgainVideos(otherResponse.listenAgain || []);
        setPodcastVideos(otherResponse.podcasts || []);
      };
      
      // Apply all state updates in a single tick to reduce render cycles
      stateUpdates();
      
      // Cache the data
      const dataToCache = {
        trending: otherResponse.trending || [],
        newReleases: otherResponse.newReleases || [],
        listenAgain: otherResponse.listenAgain || [],
        podcasts: otherResponse.podcasts || [],
        focus: moodResponse.focus || [],
        workout: moodResponse.workout || [],
        chill: moodResponse.chill || [],
        party: moodResponse.party || [],
        timestamp: Date.now()
      };
      
      localStorage.setItem('homepageData', JSON.stringify(dataToCache));
      
      // Log API usage statistics
      logApiUsageStats();
    } catch (error: any) {
      console.error("Error fetching data from YouTube API:", error);
      
      // Check if the error is related to quota
      if (error.message && typeof error.message === 'string' && error.message.includes('quota')) {
        setQuotaError(true);
      }
      
      // Fallback data will be used from the API's error handling
    } finally {
      console.timeEnd('fetchData');
      setIsLoading(false);
      window._isFetchingHomeData = false;
    }
  }, []);
  
  // Create a callback for refreshing content after key rotation
  const refreshAfterKeyChange = useCallback(() => {
    console.log('\n🔄🔄🔄 REFRESHING CONTENT AFTER KEY CHANGE 🔄🔄🔄');
    
    // Clear all relevant caches to force fresh data
    clearCacheByPattern('search');
    clearCacheByPattern('videos');
    
    // Reset quota error state
    setQuotaError(false);
    
    // Fetch fresh data
    console.log('🔄 Triggering fetchData to get fresh content with new API key');
    fetchData(false);
    
    console.log('🔄🔄🔄 REFRESH AFTER KEY CHANGE COMPLETE 🔄🔄🔄\n');
  }, [fetchData]);
  
  // LocalStorage data caching
  useEffect(() => {
    // Load cached data on mount
    try {
      const cachedData = localStorage.getItem('homepageData');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const cacheTime = parsedData.timestamp || 0;
        const now = Date.now();
        const cacheAge = now - cacheTime;
        
        // Use cache if it's less than 6 hours old
        if (cacheAge < 6 * 60 * 60 * 1000) {
          console.log('Using cached homepage data');
          setTrendingVideos(parsedData.trending || []);
          setNewReleases(parsedData.newReleases || []);
          setListenAgainVideos(parsedData.listenAgain || []);
          setPodcastVideos(parsedData.podcasts || []);
          setFocusVideos(parsedData.focus || []);
          setWorkoutVideos(parsedData.workout || []);
          setChillVideos(parsedData.chill || []);
          setPartyVideos(parsedData.party || []);
          
          // Still load fresh data in the background
          // This was likely causing the infinite loop if fetchData triggers re-renders
          // that cause useEffect to run again
          setIsLoading(false);
          
          // Use a timeout to avoid React 18's double-mounting in development causing issues
          const timer = setTimeout(() => {
            fetchData(true);
          }, 100);
          
          return () => clearTimeout(timer);
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
    
    // Fetch fresh data if no cache or cache is old
    fetchData(false);
    
    // Return empty cleanup function to satisfy the hook
    return () => {};
  }, [fetchData]); // Add fetchData as a dependency
  
  // Check for quota issues on mount and set state accordingly
  useEffect(() => {
    const hasQuotaIssues = checkQuotaStatus();
    if (hasQuotaIssues) {
      setQuotaError(true);
    }
  }, []);
  
  // Fetch all mood categories in one batch to reduce API calls
  const fetchMoodCategories = async () => {
    console.time('fetchMoodCategories');
    try {
      // Stagger API calls to spread quota usage
      // First fetch only the most important categories
      const [focus, workout] = await Promise.all([
        getMoodVideos("focus", MAX_FETCH_RESULTS),
        getMoodVideos("workout", MAX_FETCH_RESULTS),
      ]);
      
      // Initialize with empty arrays for less important categories
      let chill: VideoItem[] = [];
      let party: VideoItem[] = [];
      
      // Schedule less important categories to load after a delay
      setTimeout(async () => {
        try {
          if (!checkQuotaStatus()) {
            const [chillResults, partyResults] = await Promise.all([
              getMoodVideos("chill", MAX_FETCH_RESULTS),
              getMoodVideos("party", MAX_FETCH_RESULTS),
            ]);
            
            // Update state with delayed results
            setChillVideos(chillResults.slice(0, ITEMS_PER_SECTION));
            setPartyVideos(partyResults.slice(0, ITEMS_PER_SECTION));
            
            // Update cache with new data
            try {
              const cachedData = localStorage.getItem('homepageData');
              if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                parsedData.chill = chillResults.slice(0, ITEMS_PER_SECTION);
                parsedData.party = partyResults.slice(0, ITEMS_PER_SECTION);
                localStorage.setItem('homepageData', JSON.stringify(parsedData));
              }
            } catch (error) {
              console.error('Error updating cache with delayed categories:', error);
            }
          }
        } catch (error) {
          console.error('Error loading delayed mood categories:', error);
        }
      }, 5000); // Load after 5 seconds
      
      console.timeEnd('fetchMoodCategories');
      return {
        focus: focus.slice(0, ITEMS_PER_SECTION), 
        workout: workout.slice(0, ITEMS_PER_SECTION),
        chill: [], // Initially empty, will be populated later
        party: []  // Initially empty, will be populated later
      };
    } catch (error) {
      console.error("Error fetching mood categories:", error);
      console.timeEnd('fetchMoodCategories');
      return { focus: [], workout: [], chill: [], party: [] };
    }
  };
  
  // Fetch other categories in one batch
  const fetchOtherCategories = async () => {
    console.time('fetchOtherCategories');
    try {
      // Get trending music (only costs 5 quota units) and new releases (most visible)
      const [trending, releases] = await Promise.all([
        // Get trending music (only costs 5 quota units)
        getTrendingMusic(MAX_FETCH_RESULTS),
        // Fetch new releases data
        getNewReleases(MAX_FETCH_RESULTS),
      ]);
      
      // Initialize with empty arrays for less important categories
      let relatedSongs: VideoItem[] = [];
      let podcasts: VideoItem[] = [];
      
      // Schedule less important categories to load after a delay
      setTimeout(async () => {
        try {
          if (!checkQuotaStatus()) {
            // Use some popular song IDs to find related content for "Listen Again"
            const relatedResults = await getRelatedVideos("MlGxz0KIqLM", MAX_FETCH_RESULTS);
            setListenAgainVideos(relatedResults.slice(0, ITEMS_PER_SECTION));
            
            // Update cache with new data
            try {
              const cachedData = localStorage.getItem('homepageData');
              if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                parsedData.listenAgain = relatedResults.slice(0, ITEMS_PER_SECTION);
                localStorage.setItem('homepageData', JSON.stringify(parsedData));
              }
            } catch (error) {
              console.error('Error updating cache with related songs:', error);
            }
          }
        } catch (error) {
          console.error('Error loading related songs:', error);
        }
      }, 3000); // Load after 3 seconds
      
      // Schedule podcasts to load last (lowest priority)
      setTimeout(async () => {
        try {
          if (!checkQuotaStatus()) {
            // Fetch podcast videos
            const podcastResults = await searchVideos("top podcasts music episodes", MAX_FETCH_RESULTS);
            setPodcastVideos(podcastResults.slice(0, ITEMS_PER_SECTION));
            
            // Update cache with new data
            try {
              const cachedData = localStorage.getItem('homepageData');
              if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                parsedData.podcasts = podcastResults.slice(0, ITEMS_PER_SECTION);
                localStorage.setItem('homepageData', JSON.stringify(parsedData));
              }
            } catch (error) {
              console.error('Error updating cache with podcasts:', error);
            }
          }
        } catch (error) {
          console.error('Error loading podcasts:', error);
        }
      }, 7000); // Load after 7 seconds
      
      console.timeEnd('fetchOtherCategories');
      return {
        trending: trending.slice(0, ITEMS_PER_SECTION),
        newReleases: releases.slice(0, ITEMS_PER_SECTION),
        listenAgain: [], // Initially empty, will be populated later
        podcasts: []     // Initially empty, will be populated later
      };
    } catch (error) {
      console.error("Error fetching other categories:", error);
      console.timeEnd('fetchOtherCategories');
      return { trending: [], newReleases: [], listenAgain: [], podcasts: [] };
    }
  };
  
  // Function to get appropriate greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Function to refresh just the New Releases section
  const refreshNewReleases = async () => {
    console.log('Manually refreshing New Releases section');
    
    // If we have quota issues, show a warning instead of trying to refresh
    if (checkQuotaStatus()) {
      setQuotaError(true);
      window.alert('Cannot refresh due to YouTube API quota limits. Please try again later.');
      return;
    }
    
    // Clear the cache for this specific query
    clearCacheByPattern('new music');
    clearCacheByPattern('new songs');
    
    try {
      setIsLoadingNewReleases(true);
      const freshReleases = await getNewReleases(MAX_FETCH_RESULTS);
      setNewReleases(freshReleases.slice(0, ITEMS_PER_SECTION));
      
      // Update just this section in the cache
      try {
        const cachedData = localStorage.getItem('homepageData');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          parsedData.newReleases = freshReleases.slice(0, ITEMS_PER_SECTION);
          localStorage.setItem('homepageData', JSON.stringify(parsedData));
        }
      } catch (error) {
        console.error('Error updating cache:', error);
      }
    } catch (error) {
      console.error('Error refreshing New Releases:', error);
      
      // Check if the error is quota-related
      if (error instanceof Error && error.message.includes('quota')) {
        setQuotaError(true);
      }
    } finally {
      setIsLoadingNewReleases(false);
    }
  };
  
  const handleRefresh = useCallback(() => {
    if (isRefreshDebounced) {
      console.log('Refresh debounced, please wait before refreshing again');
      return;
    }
    
    // Set debounce flag
    setIsRefreshDebounced(true);
    
    // Clear cache and fetch fresh data
    clearCacheByPattern('homepageData');
    fetchData(false);
    
    // Reset debounce after 10 seconds
    setTimeout(() => {
      setIsRefreshDebounced(false);
    }, 10000);
  }, [fetchData, isRefreshDebounced]);
  
  // Replace the existing refresh button click handler with our debounced version
  const refreshButtonClick = () => {
    handleRefresh();
  };

  // Function to load data sequentially
  const loadDataSequentially = async () => {
    try {
      // First, load the most important categories
      console.log("🔄 Loading primary categories (focus and workout)...");
      const [focusData, workoutData] = await Promise.all([
        getMoodVideos('focus', MAX_FETCH_RESULTS),
        getMoodVideos('workout', MAX_FETCH_RESULTS),
      ]);
      
      setFocusVideos(focusData.slice(0, ITEMS_PER_SECTION));
      setWorkoutVideos(workoutData.slice(0, ITEMS_PER_SECTION));
      
      // Then load trending and new releases with a small delay
      console.log("🔄 Loading trending and new releases...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const [trendingData, newReleasesData] = await Promise.all([
        getTrendingMusic(MAX_FETCH_RESULTS),
        getNewReleases(MAX_FETCH_RESULTS),
      ]);
      
      setTrendingVideos(trendingData.slice(0, ITEMS_PER_SECTION));
      setNewReleases(newReleasesData.slice(0, ITEMS_PER_SECTION));
      
      // Finally, load the less important categories
      console.log("🔄 Loading secondary categories (chill, party, and related)...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!checkQuotaStatus()) {
        const [chillData, partyData] = await Promise.all([
          getMoodVideos('chill', MAX_FETCH_RESULTS),
          getMoodVideos('party', MAX_FETCH_RESULTS),
        ]);
        
        setChillVideos(chillData.slice(0, ITEMS_PER_SECTION));
        setPartyVideos(partyData.slice(0, ITEMS_PER_SECTION));
        
        // Load related songs last
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!checkQuotaStatus()) {
          const relatedResults = await getRelatedVideos("MlGxz0KIqLM", MAX_FETCH_RESULTS);
          setListenAgainVideos(relatedResults.slice(0, ITEMS_PER_SECTION));
        }
      }
      
      // Update cache with all the data
      try {
        const cacheData = {
          focus: focusVideos,
          workout: workoutVideos,
          trending: trendingVideos,
          newReleases: newReleases,
          chill: chillVideos,
          party: partyVideos,
          listenAgain: listenAgainVideos,
        };
        localStorage.setItem('homepageData', JSON.stringify(cacheData));
      } catch (error) {
        console.error('Error updating cache:', error);
      }
      
      // Set loading to false when all data is loaded
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data sequentially:', error);
      setIsLoading(false);
    }
  };

  // In the useEffect, replace the existing data loading with the sequential approach
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Try to load data from cache first
        const cachedData = localStorage.getItem('homepageData');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          
          // Set data from cache
          setFocusVideos(parsedData.focus || []);
          setWorkoutVideos(parsedData.workout || []);
          setTrendingVideos(parsedData.trending || []);
          setNewReleases(parsedData.newReleases || []);
          setChillVideos(parsedData.chill || []);
          setPartyVideos(parsedData.party || []);
          setListenAgainVideos(parsedData.listenAgain || []);
          
          // Set loading to false since we have data from cache
          setIsLoading(false);
          
          // Load fresh data in the background
          loadDataSequentially();
        } else {
          // No cache, load data sequentially
          await loadDataSequentially();
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-black text-white">
        <CategoryBar />
        
        <div className="py-4 px-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">
            {getGreeting()}, {userName}
          </h1>
          
          <button 
            className={`flex items-center text-sm px-3 py-1 rounded-full bg-gray-800 ${isRefreshDebounced ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-gray-700'} transition-colors`}
            onClick={refreshButtonClick}
            disabled={isLoading || isRefreshDebounced}
            title={isRefreshDebounced ? "Please wait before refreshing again" : "Refresh all content"}
          >
            <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : isRefreshDebounced ? 'opacity-50' : ''}`} />
            {isLoading ? 'Loading...' : isRefreshDebounced ? 'Wait 10s...' : 'Refresh All'}
          </button>
        </div>
        
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="mb-6 px-4">
            <div className="h-7 w-48 bg-gray-800 rounded mb-4 animate-pulse"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map(j => (
                <div key={j} className="w-full aspect-square bg-gray-800 rounded animate-pulse">
                  <div className="h-full w-full"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Category navigation */}
      <CategoryBar />
      
      {/* Welcome header */}
      <div className="px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{getGreeting()}, {userName}</h1>
        
        <button 
          className={`flex items-center text-sm px-3 py-1 rounded-full bg-gray-800 ${isRefreshDebounced ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-gray-700'} transition-colors`}
          onClick={refreshButtonClick}
          disabled={isLoading || isRefreshDebounced}
          title={isRefreshDebounced ? "Please wait before refreshing again" : "Refresh all content"}
        >
          <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : isRefreshDebounced ? 'opacity-50' : ''}`} />
          {isLoading ? 'Loading...' : isRefreshDebounced ? 'Wait 10s...' : 'Refresh All'}
        </button>
        
        {/* Show quota warning if needed */}
        {quotaError && <QuotaAlert onRefreshAfterKeyChange={refreshAfterKeyChange} />}
        
        {/* Debug button to force show the QuotaAlert */}
        <button 
          onClick={() => setQuotaError(prev => !prev)}
          className="mt-2 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1 px-3 rounded flex items-center"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          {quotaError ? 'Hide' : 'Show'} Quota Alert (Debug)
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 px-4 pb-24">
        <MusicSection 
          title="Listen again" 
          subtitle="Your favorites and recently played tracks"
          moreLink="/history">
          {listenAgainVideos.map((video) => (
            <AlbumCard 
              key={video.id}
              video={video}
            />
          ))}
        </MusicSection>

        <MusicSection 
          title="Trending music" 
          subtitle="Popular tracks right now"
          moreLink="/explore/trending">
          {trendingVideos.map((video) => (
            <AlbumCard 
              key={video.id}
              video={video}
              isNew={true}
            />
          ))}
        </MusicSection>
        
        <MusicSection 
          title="New releases" 
          subtitle="Fresh music from artists you might like"
          moreLink="/explore/new"
          actionButton={
            <button 
              className={`flex items-center text-sm ${isRefreshDebounced ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'} transition-colors`}
              onClick={refreshButtonClick}
              disabled={isLoadingNewReleases || isRefreshDebounced}
              title={isRefreshDebounced ? "Please wait before refreshing again" : "Refresh new releases"}
            >
              <RefreshCw size={14} className={`mr-1 ${isLoadingNewReleases ? 'animate-spin' : isRefreshDebounced ? 'opacity-50' : ''}`} />
              {isLoadingNewReleases ? 'Refreshing...' : isRefreshDebounced ? 'Wait 10s...' : 'Refresh'}
            </button>
          }
        >
          {isLoadingNewReleases ? (
            // Loading skeleton for just this section
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map(j => (
                <div key={j} className="w-full aspect-square bg-gray-800 rounded animate-pulse">
                  <div className="h-full w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            newReleases.map((video) => (
              <AlbumCard 
                key={video.id}
                video={video}
                isNew={true}
              />
            ))
          )}
        </MusicSection>
        
        <MusicSection 
          title="Focus" 
          subtitle="Music to help you concentrate"
          moreLink="/explore/focus">
          {focusVideos.map((video) => (
            <AlbumCard 
              key={video.id}
              video={video}
            />
          ))}
        </MusicSection>
        
        <MusicSection 
          title="Workout" 
          subtitle="Upbeat music to keep you going"
          moreLink="/explore/workout">
          {workoutVideos.map((video) => (
            <AlbumCard 
              key={video.id}
              video={video}
            />
          ))}
        </MusicSection>
        
        {chillVideos.length > 0 && (
          <MusicSection 
            title="Chill" 
            subtitle="Relax and unwind with these tracks"
            moreLink="/explore/chill">
            {chillVideos.map((video) => (
              <AlbumCard 
                key={video.id}
                video={video}
              />
            ))}
          </MusicSection>
        )}
        
        {partyVideos.length > 0 && (
          <MusicSection 
            title="Party" 
            subtitle="Get the good vibes flowing"
            moreLink="/explore/party">
            {partyVideos.map((video) => (
              <AlbumCard 
                key={video.id}
                video={video}
              />
            ))}
          </MusicSection>
        )}
      </div>
    </div>
  );
} 