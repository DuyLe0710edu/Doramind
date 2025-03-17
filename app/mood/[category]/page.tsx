"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MusicSection from '../../components/sections/MusicSection';
import AlbumCard from '../../components/ui/AlbumCard';
import CategoryBar from '../../components/ui/CategoryBar';
import { getMoodVideos, VideoItem } from '../../lib/utils/youtube-api';

// Function to capitalize first letter of each word
function capitalizeWords(str: string) {
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

// Function to get a description based on category
function getCategoryDescription(category: string) {
  const descriptions: Record<string, string> = {
    'focus': 'Concentrate better with music that helps you focus',
    'workout': 'Energizing tracks to fuel your exercise routine',
    'relax': 'Calm your mind with relaxing sounds and melodies',
    'sleep': 'Peaceful music to help you drift off to sleep',
    'party': 'Upbeat tracks perfect for any celebration',
    'study': 'Background music to enhance your learning sessions',
    'gaming': 'Epic soundtracks and beats for your gaming sessions',
    'energy': 'High-tempo tracks to boost your energy levels',
    'commute': 'Make your travel time more enjoyable',
    'chill': 'Easy listening for when you just want to unwind',
  };
  
  return descriptions[category.toLowerCase()] || `Enjoy a curated selection of ${category.toLowerCase()} music`;
}

export default function CategoryPage() {
  const params = useParams();
  const category = typeof params.category === 'string' ? params.category : '';
  
  const [isLoading, setIsLoading] = useState(true);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<VideoItem[]>([]);
  
  useEffect(() => {
    async function fetchCategoryData() {
      setIsLoading(true);
      try {
        // Get main category videos
        const categoryVideos = await getMoodVideos(category, 18);
        setVideos(categoryVideos);
        
        // Get a more specific variant for the category
        const relatedTerm = `${category} ${category === 'focus' ? 'instrumental' : 'playlist'}`;
        const related = await getMoodVideos(relatedTerm, 6);
        setRelatedVideos(related);
      } catch (error) {
        console.error(`Error fetching ${category} videos:`, error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (category) {
      fetchCategoryData();
    }
  }, [category]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="pb-6">
        <div className="sticky top-16 z-10">
          <CategoryBar />
        </div>
        <div className="p-4">
          <h1 className="text-3xl font-bold mb-2 animate-pulse bg-gray-800 w-1/3 h-10"></h1>
          <p className="text-gray-400 mb-6 animate-pulse bg-gray-800 w-2/3 h-6"></p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array(12).fill(0).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-800 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="pb-6">
      <div className="sticky top-16 z-10">
        <CategoryBar />
      </div>
      
      <div className="p-4">
        <h1 className="text-3xl font-bold mb-2">
          {capitalizeWords(category)} Music
        </h1>
        <p className="text-gray-400 mb-6">
          {getCategoryDescription(category)}
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {videos.slice(0, 12).map((video) => (
            <AlbumCard key={video.id} video={video} />
          ))}
        </div>
        
        {videos.length > 12 && (
          <MusicSection 
            title={`More ${capitalizeWords(category)} Tracks`}
            subtitle="Discover additional music in this category"
          >
            {videos.slice(12).map((video) => (
              <AlbumCard key={video.id} video={video} />
            ))}
          </MusicSection>
        )}
        
        {relatedVideos.length > 0 && (
          <MusicSection 
            title={`${capitalizeWords(category)} Playlists`}
            subtitle="Complete collections ready to play"
          >
            {relatedVideos.map((video) => (
              <AlbumCard key={video.id} video={video} />
            ))}
          </MusicSection>
        )}
      </div>
    </div>
  );
} 