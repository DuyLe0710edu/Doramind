"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MusicSection from '../../components/sections/MusicSection';
import AlbumCard from '../../components/ui/AlbumCard';
import { VideoItem, getTrendingMusic, getNewReleases, getMoodVideos, checkQuotaStatus } from '../../lib/utils/youtube-api';
import CategoryBar from '../../components/ui/CategoryBar';
import { AlertTriangle } from 'lucide-react';

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState("New Releases");
  const [isLoading, setIsLoading] = useState(true);
  const [quotaError, setQuotaError] = useState(false);
  
  // State for all video categories
  const [newReleasesData, setNewReleasesData] = useState<VideoItem[]>([]);
  const [topSongsData, setTopSongsData] = useState<VideoItem[]>([]);
  const [hasData, setHasData] = useState(false);
  
  // Navigation categories
  const navCategories = [
    "New Releases",
    "Charts",
    "Moods & Genres",
    "Podcasts"
  ];

  // Mood categories
  const moodsData = [
    { id: 'workout', title: "Workout", cover: "https://i.scdn.co/image/ab67706f000000029249b35f23fb596b6f006a15" },
    { id: 'chill', title: "Chill", cover: "https://i.scdn.co/image/ab67706f00000002c414e7daf34690c9f983f76e" },
    { id: 'focus', title: "Focus", cover: "https://i.scdn.co/image/ab67706f00000002b70e0223f544b1faa2e95ed0" },
    { id: 'party', title: "Party", cover: "https://i.scdn.co/image/ab67706f00000002caa115cbdb8cd3d39d67cdc0" },
    { id: 'sleep', title: "Sleep", cover: "https://i.scdn.co/image/ab67706f00000002b70e0223f544b1faa2e95ed0" },
    { id: 'romance', title: "Romance", cover: "https://i.scdn.co/image/ab67706f000000023b5a13e3c1cde3b38539eba4" },
  ];
  
  // Check for quota issues on mount and set state accordingly
  useEffect(() => {
    const hasQuotaIssues = checkQuotaStatus();
    if (hasQuotaIssues) {
      setQuotaError(true);
    }
  }, []);
  
  // Fetch data on component mount
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      try {
        // Try to load data from cache first
        let cachedData = null;
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('explorePage');
          if (cached) {
            cachedData = JSON.parse(cached);
            const cacheTime = cachedData.timestamp || 0;
            const now = Date.now();
            
            // Use cache if it's less than 6 hours old
            if (now - cacheTime < 6 * 60 * 60 * 1000) {
              console.log('Using cached explore page data');
              setNewReleasesData(cachedData.newReleases || []);
              setTopSongsData(cachedData.topSongs || []);
              setHasData(true);
              setIsLoading(false);
              
              // Fetch fresh data in the background
              fetchFreshData();
              return;
            }
          }
        }
        
        // No valid cache, fetch fresh data
        await fetchFreshData();
      } catch (error) {
        console.error('Error fetching explore page data:', error);
        setQuotaError(true);
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  // Function to fetch fresh data from API
  async function fetchFreshData() {
    try {
      // Fetch from multiple endpoints in parallel
      const [newReleases, trending] = await Promise.all([
        getNewReleases(12),
        getTrendingMusic(12)
      ]);
      
      // Update state with fetched data
      setNewReleasesData(newReleases);
      setTopSongsData(trending);
      setHasData(true);
      
      // Cache the data
      if (typeof window !== 'undefined') {
        localStorage.setItem('explorePage', JSON.stringify({
          newReleases,
          topSongs: trending,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error fetching fresh data:', error);
      setQuotaError(true);
    } finally {
      setIsLoading(false);
    }
  }
  
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="py-4">
        <CategoryBar />
        
        {[1, 2, 3].map(i => (
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
    <div className="py-4">
      {/* Navigation */}
      <CategoryBar />
      
      <div className="flex overflow-x-auto space-x-4 mb-8 pb-2 px-4">
        {navCategories.map((category) => (
          <button
            key={category}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium ${
              activeCategory === category
                ? 'bg-white text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            } transition-colors`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
      
      {/* Show quota warning if needed */}
      {quotaError && (
        <div className="mx-4 mt-2 mb-6 p-4 rounded bg-yellow-800/70 text-yellow-100 text-sm flex items-start">
          <AlertTriangle size={18} className="mt-0.5 mr-3 flex-shrink-0" />
          <div className="space-y-2">
            <p className="font-medium text-base">YouTube API quota exceeded</p>
            <p className="leading-relaxed">
              We've reached the daily limit for YouTube API requests. The app is now showing curated fallback content until our quota resets.
            </p>
            <p className="leading-relaxed">
              You can still browse and play the displayed songs. We'll automatically resume API calls tomorrow when the quota refreshes.
            </p>
          </div>
        </div>
      )}

      {/* New Albums & Singles Section */}
      <MusicSection title="New albums & singles" moreLink="/new-releases">
        {newReleasesData.map((video) => (
          <AlbumCard
            key={video.id}
            video={video}
            isNew={true}
          />
        ))}
      </MusicSection>

      {/* Top Songs Section */}
      <MusicSection title="Top songs" moreLink="/charts">
        {topSongsData.map((video) => (
          <AlbumCard
            key={video.id}
            video={video}
          />
        ))}
      </MusicSection>

      {/* Moods & Genres Section */}
      <section className="py-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Moods & genres</h2>
          <Link 
            href="/moods-genres"
            className="flex items-center text-sm text-white/70 hover:text-white hover:underline"
          >
            <span>More</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {moodsData.map((mood) => (
            <Link key={mood.id} href={`/mood/${mood.id}`}>
              <div className="relative rounded-lg overflow-hidden aspect-square">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70"></div>
                <img 
                  src={mood.cover} 
                  alt={mood.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 text-white font-medium">
                  {mood.title}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
} 