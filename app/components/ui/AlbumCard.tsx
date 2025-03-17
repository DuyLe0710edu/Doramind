"use client"

import Image from 'next/image';
import { Play, Pause, MoreVertical, AlertCircle } from 'lucide-react';
import { useMusicStore } from '@/app/lib/store/music-store';
import { VideoItem } from '@/app/lib/utils/youtube-api';
import { useState, useEffect } from 'react';

interface AlbumCardProps {
  video?: VideoItem;
  id?: string;
  title?: string;
  artist?: string;
  imageUrl?: string;
  isNew?: boolean;
  onClick?: () => void;
}

export default function AlbumCard({ 
  video, 
  id, 
  title, 
  artist, 
  imageUrl,
  isNew = false, 
  onClick 
}: AlbumCardProps) {
  const { currentSong, isPlaying, setCurrentSong, togglePlay } = useMusicStore((state) => ({
    currentSong: state.currentSong,
    isPlaying: state.isPlaying,
    setCurrentSong: state.setCurrentSong,
    togglePlay: state.togglePlay
  }));
  
  const [isHovering, setIsHovering] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isKnownInvalidVideo, setIsKnownInvalidVideo] = useState(false);
  
  // Support both ways of providing data
  const videoId = video?.id || id;
  const videoTitle = video?.title || title;
  const videoArtist = video?.channelTitle || artist;
  const videoImageUrl = video?.thumbnails?.high?.url || imageUrl;
  
  const isCurrentlyPlaying = currentSong?.id === videoId;
  
  // Check if this song is marked as invalid in localStorage
  useEffect(() => {
    if (videoId) {
      try {
        const invalidVideos = localStorage.getItem('invalidVideos');
        if (invalidVideos) {
          const invalidList = JSON.parse(invalidVideos);
          if (Array.isArray(invalidList) && invalidList.includes(videoId)) {
            setIsKnownInvalidVideo(true);
          }
        }
      } catch (error) {
        console.error('Error checking invalid videos:', error);
      }
    }
  }, [videoId]);
  
  const handlePlay = () => {
    if (isKnownInvalidVideo) {
      console.warn(`Skipping invalid video: ${videoId}`);
      return;
    }
    
    if (isCurrentlyPlaying) {
      togglePlay();
    } else {
      // If we have a video object, use it directly
      if (video) {
        setCurrentSong(video);
      } 
      // Otherwise create a compatible object from individual props
      else if (videoId && videoTitle && videoImageUrl) {
        setCurrentSong({
          id: videoId,
          title: videoTitle,
          channelTitle: videoArtist || '',
          publishedAt: new Date().toISOString(),
          thumbnails: {
            high: {
              url: videoImageUrl
            }
          }
        });
      }
    }
    
    if (onClick) onClick();
  };

  const handleImageError = () => {
    setImageError(true);
    // Don't mark the video as invalid just because the thumbnail failed to load
    // The video might still play fine
  };
  
  const markAsInvalid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoId) {
      try {
        const invalidVideos = localStorage.getItem('invalidVideos');
        const invalidList = invalidVideos ? JSON.parse(invalidVideos) : [];
        if (!invalidList.includes(videoId)) {
          invalidList.push(videoId);
          localStorage.setItem('invalidVideos', JSON.stringify(invalidList));
        }
        setIsKnownInvalidVideo(true);
      } catch (error) {
        console.error('Error marking video as invalid:', error);
      }
    }
  };

  const handleMoreOptions = (e: React.MouseEvent) => {
    e.stopPropagation();
    // In a real app, this would open a dropdown menu with more options
    console.log('More options for:', videoTitle);
  };

  // If we don't have enough data, don't render
  if (!videoId || !videoTitle || !videoImageUrl) {
    return null;
  }
  
  // Fallback image URL if the original fails to load
  const fallbackImage = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div 
      className={`album-card hover-rise group cursor-pointer ${isKnownInvalidVideo ? 'opacity-50' : ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={isKnownInvalidVideo ? undefined : handlePlay}
    >
      <div className="relative aspect-square rounded-md overflow-hidden mb-2">
        {/* Main Image */}
        {!imageError ? (
          <Image
            src={videoImageUrl}
            alt={`${videoTitle} by ${videoArtist || 'Unknown Artist'}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            onError={handleImageError}
            unoptimized
          />
        ) : (
          // Fallback image if the main one fails
          <Image
            src={fallbackImage}
            alt={`${videoTitle} by ${videoArtist || 'Unknown Artist'}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            unoptimized
          />
        )}
        
        {/* Overlay gradient */}
        <div className={`absolute inset-0 bg-gradient-to-b from-black/0 to-black/60 transition-opacity duration-300 ${
          isHovering || isCurrentlyPlaying ? 'opacity-100' : 'opacity-0'
        }`}></div>
        
        {/* Play Button Overlay - Don't show for invalid videos */}
        {!isKnownInvalidVideo && (
          <div 
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
              isHovering || isCurrentlyPlaying ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button 
              className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/20 transition-colors transform hover:scale-105 active:scale-95"
              onClick={handlePlay}
            >
              {isCurrentlyPlaying && isPlaying ? (
                <Pause size={24} className="text-white" />
              ) : (
                <Play size={24} className="text-white ml-1" />
              )}
            </button>
          </div>
        )}
        
        {/* Invalid Video Indicator */}
        {isKnownInvalidVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center p-2">
              <AlertCircle size={24} className="text-red-500 mx-auto mb-1" />
              <p className="text-xs text-white">Video unavailable</p>
            </div>
          </div>
        )}
        
        {/* More Options Button */}
        <div 
          className={`absolute top-2 right-2 flex transition-opacity duration-300 ${
            isHovering ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Mark as invalid button - will help user flag problematic videos */}
          {!isKnownInvalidVideo && (
            <button 
              className="p-1 bg-black/60 rounded-full mr-1"
              onClick={markAsInvalid}
              title="Mark as unavailable"
            >
              <AlertCircle size={14} className="text-red-400" />
            </button>
          )}
          
          <button 
            className="p-1 bg-black/60 rounded-full"
            onClick={handleMoreOptions}
          >
            <MoreVertical size={16} className="text-white" />
          </button>
        </div>
        
        {/* New Badge */}
        {isNew && !isKnownInvalidVideo && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-sm font-medium">
            NEW
          </div>
        )}
        
        {/* Currently Playing Indicator */}
        {isCurrentlyPlaying && !isKnownInvalidVideo && (
          <div className="absolute bottom-2 right-2 bg-red-600 h-1.5 w-1.5 rounded-full animate-pulse"></div>
        )}
      </div>
      
      <h3 className={`text-sm font-medium truncate ${isKnownInvalidVideo ? 'text-white/50' : 'text-white'}`}>
        {videoTitle}
      </h3>
      <p className={`text-xs truncate ${isKnownInvalidVideo ? 'text-white/30' : 'text-white/70'}`}>
        {videoArtist || 'Unknown Artist'}
      </p>
    </div>
  );
} 