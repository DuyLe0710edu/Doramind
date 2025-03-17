"use client"

import { useEffect, useState } from 'react';
import MusicSection from '../components/sections/MusicSection';
import AlbumCard from '../components/ui/AlbumCard';
import CategoryBar from '../components/ui/CategoryBar'; 
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
// Fetch more items to avoid additional API calls
const MAX_FETCH_RESULTS = 50;

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
  }, []); // Empty dependency array means this only runs once on mount
  
  // Check for quota issues on mount and set state accordingly
  useEffect(() => {
    const hasQuotaIssues = checkQuotaStatus();
    if (hasQuotaIssues) {
      setQuotaError(true);
    }
  }, []);
  
  // Optimize data fetching to use fewer API calls
  const fetchData = async (isBackgroundRefresh = false) => {
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
  };
  
  // Fetch all mood categories in one batch to reduce API calls
  const fetchMoodCategories = async () => {
    console.time('fetchMoodCategories');
    try {
      // Fetch a larger number of results for each category to avoid additional API calls
      const [focus, workout, chill, party] = await Promise.all([
        getMoodVideos("focus", MAX_FETCH_RESULTS),
        getMoodVideos("workout", MAX_FETCH_RESULTS),
        getMoodVideos("chill", MAX_FETCH_RESULTS),
        getMoodVideos("party", MAX_FETCH_RESULTS)
      ]);
      
      console.timeEnd('fetchMoodCategories');
      return {
        focus: focus.slice(0, ITEMS_PER_SECTION), 
        workout: workout.slice(0, ITEMS_PER_SECTION),
        chill: chill.slice(0, ITEMS_PER_SECTION),
        party: party.slice(0, ITEMS_PER_SECTION)
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
      // Get trending music (only costs 5 quota units)
      const trending = await getTrendingMusic(MAX_FETCH_RESULTS);
      
      // Fetch new releases data
      const releases = await getNewReleases(MAX_FETCH_RESULTS);
      
      // Use some popular song IDs to find related content for "Listen Again"
      // Taylor Swift - Fortnight
      const relatedSongs = await getRelatedVideos("MlGxz0KIqLM", MAX_FETCH_RESULTS);
      
      // Fetch podcast videos
      const podcasts = await searchVideos("top podcasts music episodes", MAX_FETCH_RESULTS);
      
      console.timeEnd('fetchOtherCategories');
      return {
        trending: trending.slice(0, ITEMS_PER_SECTION),
        newReleases: releases.slice(0, ITEMS_PER_SECTION),
        listenAgain: relatedSongs.slice(0, ITEMS_PER_SECTION),
        podcasts: podcasts.slice(0, ITEMS_PER_SECTION)
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

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-black text-white">
        <CategoryBar />
        
        <div className="py-4 px-6">
          <h1 className="text-2xl font-bold text-white">
            {getGreeting()}, {userName}
          </h1>
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
      <div className="px-6 py-4">
        <h1 className="text-2xl font-bold">{getGreeting()}, {userName}</h1>
        
        {/* Show quota warning if needed */}
        {quotaError && (
          <div className="mt-2 p-4 rounded bg-yellow-800/70 text-yellow-100 text-sm flex items-start">
            <AlertTriangle size={18} className="mt-0.5 mr-3 flex-shrink-0" />
            <div className="space-y-2">
              <p className="font-medium text-base">YouTube API quota exceeded</p>
              <p className="leading-relaxed">
                We've reached the daily limit for YouTube API requests. The app is now showing curated fallback content until our quota resets.
              </p>
              <p className="leading-relaxed">
                You can still browse and play the displayed songs. We'll automatically resume API calls tomorrow when the quota refreshes.
              </p>
              <div className="pt-1 flex gap-3">
                <button 
                  className="px-3 py-1.5 rounded bg-yellow-700 hover:bg-yellow-600 transition-colors"
                  onClick={() => {
                    // Get fresh cached content if available from localStorage
                    try {
                      const cachedData = localStorage.getItem('homepageData');
                      if (cachedData) {
                        const parsedData = JSON.parse(cachedData);
                        setTrendingVideos(parsedData.trending || []);
                        setNewReleases(parsedData.newReleases || []);
                        setListenAgainVideos(parsedData.listenAgain || []);
                        setPodcastVideos(parsedData.podcasts || []);
                        setFocusVideos(parsedData.focus || []);
                        setWorkoutVideos(parsedData.workout || []);
                        setChillVideos(parsedData.chill || []);
                        setPartyVideos(parsedData.party || []);
                      }
                    } catch (error) {
                      console.error('Error loading cached data:', error);
                    }
                  }}
                >
                  Use Cached Data
                </button>
              </div>
            </div>
          </div>
        )}
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
              className="flex items-center text-sm text-gray-400 hover:text-white transition-colors"
              onClick={refreshNewReleases}
              disabled={isLoadingNewReleases}
            >
              <RefreshCw size={14} className={`mr-1 ${isLoadingNewReleases ? 'animate-spin' : ''}`} />
              {isLoadingNewReleases ? 'Refreshing...' : 'Refresh'}
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