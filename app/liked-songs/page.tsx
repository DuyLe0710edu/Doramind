"use client"

import { useState, useEffect } from 'react';
import AlbumCard from '@/app/components/ui/AlbumCard';
import { useMusicStore } from '@/app/lib/store/music-store';
import { Heart } from 'lucide-react';

export default function LikedSongsPage() {
  const { likedSongs } = useMusicStore(state => ({
    likedSongs: state.likedSongs
  }));
  
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading state for a smoother UI experience
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="flex flex-col min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="px-6 py-8 bg-gradient-to-b from-pink-900/50 to-black flex items-center gap-6">
        <div className="flex items-center justify-center w-48 h-48 bg-gradient-to-br from-pink-600 to-pink-800 rounded-lg shadow-xl">
          <Heart size={64} className="text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold">Liked Songs</h1>
          <p className="text-white/70 mt-2">
            {likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'} that you liked
          </p>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="aspect-square bg-white/5 rounded-md animate-pulse"></div>
            ))}
          </div>
        ) : likedSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Heart size={48} className="text-white/30 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No liked songs yet</h2>
            <p className="text-white/70">
              Click the heart icon on any song to add it to your liked songs
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {likedSongs.map(song => (
              <AlbumCard 
                key={song.id}
                video={song}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 