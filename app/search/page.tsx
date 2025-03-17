"use client"

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import MusicSection from '../components/sections/MusicSection';
import AlbumCard from '../components/ui/AlbumCard';
import { searchVideos, searchMusic, VideoItem } from '../lib/utils/youtube-api';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<VideoItem[]>([]);
  const [searchMusicResults, setSearchMusicResults] = useState<VideoItem[]>([]);
  
  useEffect(() => {
    async function performSearch() {
      if (!query) {
        setSearchResults([]);
        setSearchMusicResults([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Search for general videos (might include non-music content)
        const videos = await searchVideos(query, 12);
        setSearchResults(videos);
        
        // Also search specifically for music videos
        const musicVideos = await searchMusic(query, 12);
        setSearchMusicResults(musicVideos);
      } catch (error) {
        console.error('Error searching videos:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    performSearch();
  }, [query]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Searching for "{query}"...</h1>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="h-7 w-48 bg-gray-800 rounded mb-4 animate-pulse"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-800 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
          <div>
            <div className="h-7 w-48 bg-gray-800 rounded mb-4 animate-pulse"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-800 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // No search query
  if (!query) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Search for music</h1>
        <p className="text-gray-400">Type something in the search bar above to find songs, artists, and more.</p>
      </div>
    );
  }
  
  // No results
  if (searchResults.length === 0 && searchMusicResults.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">No results for "{query}"</h1>
        <p className="text-gray-400">Try searching for something else or check your spelling.</p>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Search results for "{query}"</h1>
      
      {searchMusicResults.length > 0 && (
        <MusicSection 
          title="Music Results" 
          subtitle="Songs and music videos" 
          moreLink={`/search/music?q=${encodeURIComponent(query)}`}
        >
          {searchMusicResults.map((video) => (
            <AlbumCard key={video.id} video={video} />
          ))}
        </MusicSection>
      )}
      
      {searchResults.length > 0 && (
        <MusicSection 
          title="All Results" 
          subtitle="Videos, channels, and more" 
          moreLink={`/search/all?q=${encodeURIComponent(query)}`}
        >
          {searchResults.map((video) => (
            <AlbumCard key={video.id} video={video} />
          ))}
        </MusicSection>
      )}
    </div>
  );
} 