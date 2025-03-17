"use client"

import { useEffect, useState, useRef } from 'react';
import YouTube from 'react-youtube';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Volume2, VolumeX, Shuffle, Repeat, Maximize2,
  Heart, ThumbsDown, ListMusic, Share2
} from 'lucide-react';
import Image from 'next/image';
import { useMusicStore } from '@/app/lib/store/music-store';
import { VideoItem } from '@/app/lib/utils/youtube-api';
import Link from 'next/link';

// Declare YouTube API types
declare global {
  interface Window {
    YT?: {
      Player: any;
      ready?: (callback: () => void) => void;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export default function MusicPlayer() {
  const { 
    currentSong, 
    isPlaying, 
    togglePlay, 
    setCurrentSong,
    queue, 
    addToQueue,
    skipToNext,
    skipToPrevious,
    likedSongs,
    likeSong,
    unlikeSong
  } = useMusicStore((state) => ({
    currentSong: state.currentSong,
    isPlaying: state.isPlaying,
    togglePlay: state.togglePlay,
    setCurrentSong: state.setCurrentSong,
    queue: state.queue,
    addToQueue: state.addToQueue,
    skipToNext: state.skipToNext,
    skipToPrevious: state.skipToPrevious,
    likedSongs: state.likedSongs,
    likeSong: state.likeSong,
    unlikeSong: state.unlikeSong
  }));

  const [player, setPlayer] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [youtubeApiReady, setYoutubeApiReady] = useState(false);
  
  const progressRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const skipAttempts = useRef<Record<string, number>>({});
  const playerRef = useRef<any>(null);

  // Check if current song is liked
  const isLiked = currentSong ? likedSongs.some(song => song.id === currentSong.id) : false;

  useEffect(() => {
    // Reset player state when song changes
    if (currentSong) {
      setIsLoading(true);
      setErrorMessage(null);
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      setIsPlayerReady(false);

      // If we're changing songs, reset any error states
      if (player) {
        stopProgressTracking();
      }
    }
  }, [currentSong?.id]);

  useEffect(() => {
    if (player && isPlaying && isPlayerReady) {
      try {
        // Check if player is still valid and has required methods
        if (typeof player.playVideo === 'function') {
          player.playVideo();
          startProgressTracking();
        } else {
          console.error('Player object is missing playVideo method');
          setIsPlayerReady(false);
          handlePlayerError('Player initialization error');
        }
      } catch (error) {
        console.error('Error playing video:', error);
        handlePlayerError('Failed to play video');
      }
    } else if (player && !isPlaying && isPlayerReady) {
      try {
        // Check if player is still valid and has required methods
        if (typeof player.pauseVideo === 'function') {
          player.pauseVideo();
          stopProgressTracking();
        }
      } catch (error) {
        console.error('Error pausing video:', error);
      }
    }
  }, [player, isPlaying, isPlayerReady]);

  useEffect(() => {
    // Save volume to localStorage
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('playerVolume');
      if (savedVolume) {
        const parsedVolume = parseInt(savedVolume);
        setVolume(parsedVolume);
        if (parsedVolume === 0) {
          setIsMuted(true);
        }
      }
    }
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const startProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    progressInterval.current = setInterval(() => {
      if (player) {
        try {
          // Check if player object is valid and has required methods
          if (typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
            const currentTime = player.getCurrentTime() || 0;
            const duration = player.getDuration() || 0;
            setCurrentTime(currentTime);
            setDuration(duration);
            setProgress((currentTime / duration) * 100);
          }
        } catch (error) {
          console.error('Error tracking progress:', error);
          // Stop the interval if we're having issues
          stopProgressTracking();
        }
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const onReady = (event: any) => {
    try {
      // Validate that the event and target exist
      if (!event || !event.target) {
        console.error('Invalid YouTube player event:', event);
        handlePlayerError('Failed to initialize player');
        return;
      }
      
      setPlayer(event.target);
      
      // Check if getDuration is available
      if (typeof event.target.getDuration === 'function') {
        setDuration(event.target.getDuration());
      }
      
      setIsLoading(false);
      setIsPlayerReady(true);
      
      // Apply saved volume
      if (volume !== 70) {
        if (typeof event.target.setVolume === 'function') {
          event.target.setVolume(volume);
          if (volume === 0 || isMuted) {
            if (typeof event.target.mute === 'function') {
              event.target.mute();
            }
          }
        }
      }
      
      if (isPlaying) {
        if (typeof event.target.playVideo === 'function') {
          event.target.playVideo();
          startProgressTracking();
        }
      }
    } catch (error) {
      console.error('Error in player onReady:', error);
      handlePlayerError('Player initialization error');
    }
  };

  const handlePlayerError = (message: string) => {
    console.error(`Player error: ${message}`);
    setErrorMessage(message);
    setIsLoading(false);
    
    // If we're in auto-play mode, try to skip to next song
    if (isPlaying && currentSong) {
      // Track skip attempts to prevent infinite loops
      const id = currentSong.id;
      skipAttempts.current[id] = (skipAttempts.current[id] || 0) + 1;
      
      // If we've tried too many times, stop trying
      if (skipAttempts.current[id] > 3) {
        togglePlay(); // Stop playback
        setErrorMessage(`Multiple playback errors. Please try another song.`);
        return;
      }
      
      // If error is related to missing player/src, try recreating the player first
      if (message.includes('null') || message.includes('undefined') || message.includes('initialization')) {
        setTimeout(() => recreatePlayer(), 1000);
        return;
      }
      
      // For other errors, try skipping to the next song
      console.log(`Skipping to next song due to playback error with ${id}`);
      setTimeout(() => skipToNext(), 1000);
    }
  };

  const onPlayerError = (event: any) => {
    console.error('YouTube player error:', event);
    
    // Define error messages for specific error codes
    const errorMessages: Record<number, string> = {
      2: 'Invalid video ID',
      5: 'HTML5 player error',
      100: 'Video not found or removed',
      101: 'Video cannot be played in embedded players',
      150: 'Video cannot be played in embedded players'
    };
    
    // Get error message or fallback to generic message
    const errorCode = event?.data;
    let errorMessage = errorMessages[errorCode] || 'An error occurred while playing the video';
    
    // Append error code for debugging
    if (errorCode) {
      errorMessage += ` (Error ${errorCode})`;
    }
    
    // Add additional context for common errors
    if (errorCode === 100) {
      errorMessage = 'This video has been removed or is unavailable';
    } else if (errorCode === 101 || errorCode === 150) {
      errorMessage = 'This video cannot be played due to embedding restrictions';
    }
    
    handlePlayerError(errorMessage);
  };

  const onStateChange = (event: any) => {
    // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    if (event.data === -1) {
      // Unstarted - could be loading or error
      setIsLoading(true);
    } else if (event.data === 0) { // Video ended
      handleVideoEnd();
    } else if (event.data === 1) { // Video playing
      setIsLoading(false);
      setErrorMessage(null);
      if (!isPlaying) {
        togglePlay();
      }
    } else if (event.data === 2) { // Video paused
      if (isPlaying) {
        togglePlay();
      }
    } else if (event.data === 3) { // Buffering
      setIsLoading(true);
    }
  };

  const handleVideoEnd = () => {
    if (repeatMode === 'one') {
      player.seekTo(0);
      player.playVideo();
    } else {
      skipToNext();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !player || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const progressBarWidth = rect.width;
    const seekPercentage = clickPosition / progressBarWidth;
    const seekTime = duration * seekPercentage;
    
    player.seekTo(seekTime);
    setProgress(seekPercentage * 100);
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('playerVolume', newVolume.toString());
    }
    
    if (player) {
      player.setVolume(newVolume);
      if (newVolume === 0) {
        setIsMuted(true);
        player.mute();
      } else if (isMuted) {
        setIsMuted(false);
        player.unMute();
      }
    }
  };

  const toggleMute = () => {
    if (player) {
      if (isMuted) {
        player.unMute();
        player.setVolume(volume || 70);
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    }
  };

  const toggleShuffle = () => {
    setIsShuffleOn(!isShuffleOn);
    // In a real app, this would shuffle the queue
  };

  const toggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const formatTime = (time: number) => {
    if (!time) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleLike = () => {
    if (!currentSong) return;
    
    if (isLiked) {
      unlikeSong(currentSong.id);
    } else {
      likeSong(currentSong);
    }
    
    if (isDisliked) setIsDisliked(false);
  };

  const toggleDislike = () => {
    setIsDisliked(!isDisliked);
    if (isLiked && currentSong) {
      unlikeSong(currentSong.id);
    }
  };

  // Check if YouTube API is ready
  useEffect(() => {
    // Detect if the YouTube API is already loaded
    if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
      setYoutubeApiReady(true);
      return;
    }

    // Function to load YouTube API script
    const loadYouTubeAPI = () => {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    };

    // Wait for the YouTube API to be ready
    const handleYouTubeIframeAPIReady = () => {
      console.log('YouTube Iframe API Ready');
      setYoutubeApiReady(true);
    };

    // Add global callback for when YouTube API is ready
    if (typeof window !== 'undefined') {
      window.onYouTubeIframeAPIReady = handleYouTubeIframeAPIReady;
      
      // Check if API script is already loaded
      const youtubeScripts = document.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]');
      if (youtubeScripts.length === 0) {
        loadYouTubeAPI();
      }
      
      // Fallback: if API doesn't load within 5 seconds, try again
      const apiLoadTimeout = setTimeout(() => {
        if (!window.YT) {
          console.warn('YouTube API failed to load, attempting again');
          loadYouTubeAPI();
        }
      }, 5000);
      
      return () => {
        clearTimeout(apiLoadTimeout);
      };
    }

    return () => {
      // Clean up global callback
      if (typeof window !== 'undefined') {
        window.onYouTubeIframeAPIReady = undefined;
      }
    };
  }, []);

  // Auto-retry player creation on network errors
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | null = null;
    
    if (errorMessage && (
      errorMessage.includes('network') || 
      errorMessage.includes('connection') ||
      errorMessage.includes('Failed to initialize')
    )) {
      // Auto-retry after 3 seconds for network errors
      retryTimeout = setTimeout(() => {
        console.log('Auto-retrying player creation after network error');
        handleRetry();
      }, 3000);
    }
    
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [errorMessage]);

  // Reset player on unmount
  useEffect(() => {
    return () => {
      if (player) {
        try {
          // Clean up player to prevent memory leaks
          if (typeof player.destroy === 'function') {
            player.destroy();
          }
        } catch (error) {
          console.error('Error destroying player:', error);
        }
      }
    };
  }, []);

  // Clean and recreate player if stuck in error state
  const recreatePlayer = () => {
    console.log('Attempting to recreate YouTube player');
    // Destroy old player instance if it exists
    if (player) {
      try {
        if (typeof player.destroy === 'function') {
          player.destroy();
        }
      } catch (error) {
        console.error('Error destroying player during recreation:', error);
      }
    }
    
    // Reset player state
    setPlayer(null);
    setIsPlayerReady(false);
    setIsLoading(true);
    setErrorMessage(null);
    
    // Force re-render of YouTube component by updating a key
    playerRef.current = Date.now();
  };

  // Handle retry after error
  const handleRetry = () => {
    if (errorMessage && currentSong) {
      setErrorMessage(null);
      setIsLoading(true);
      recreatePlayer();
    }
  };

  if (!currentSong) {
    return null;
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/10 ${showFullPlayer ? 'h-screen' : 'h-20'} transition-all duration-300 z-50`}>
      {/* Compact Player */}
      {!showFullPlayer && (
        <div className="flex items-center h-full px-4">
          {/* Song Info */}
          <div className="flex items-center gap-3 w-1/4">
            <div className="relative h-12 w-12 overflow-hidden rounded">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : errorMessage ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-red-500">
                  <span className="text-xs text-center px-1">Error</span>
                </div>
              ) : (
                <Image 
                  src={currentSong.thumbnails.high.url} 
                  alt={currentSong.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-white font-medium truncate">{currentSong.title}</h4>
              <p className="text-white/70 text-sm truncate">{currentSong.channelTitle}</p>
              {errorMessage && (
                <p className="text-red-500 text-xs truncate">{errorMessage}</p>
              )}
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col items-center flex-1">
            <div className="flex items-center gap-4">
              <button 
                className="p-2 text-white/70 hover:text-white transition-colors" 
                onClick={skipToPrevious}
                disabled={isLoading}
              >
                <SkipBack size={20} />
              </button>
              
              <button 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isLoading ? 'bg-gray-800 cursor-wait' : 'bg-white/10 hover:bg-white/20'
                }`}
                onClick={togglePlay}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-t-transparent border-white/70 rounded-full animate-spin"></div>
                ) : isPlaying ? (
                  <Pause size={22} />
                ) : (
                  <Play size={22} className="ml-1" />
                )}
              </button>
              
              <button 
                className="p-2 text-white/70 hover:text-white transition-colors" 
                onClick={skipToNext}
                disabled={isLoading}
              >
                <SkipForward size={20} />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full flex items-center gap-2 px-4">
              <span className="text-xs text-white/70 min-w-[40px] text-right">
                {formatTime(currentTime)}
              </span>
              
              <div 
                className="h-1 bg-white/10 rounded-full flex-1 cursor-pointer"
                ref={progressRef}
                onClick={handleProgressClick}
              >
                <div 
                  className="h-full bg-red-600 rounded-full relative" 
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 bg-red-600 rounded-full opacity-0 hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
              
              <span className="text-xs text-white/70 min-w-[40px]">
                {formatTime(duration)}
              </span>
            </div>
          </div>
          
          {/* Right Controls */}
          <div className="flex items-center gap-3 w-1/4 justify-end">
            <button 
              className={`p-2 transition-colors ${isLiked ? 'text-pink-500' : 'text-white/70 hover:text-white'}`}
              onClick={toggleLike}
              title={isLiked ? "Remove from Liked Songs" : "Add to Liked Songs"}
            >
              <Heart size={18} fill={isLiked ? '#ec4899' : 'none'} />
            </button>
            
            <button 
              className={`p-2 transition-colors ${isDisliked ? 'text-white' : 'text-white/70 hover:text-white'}`}
              onClick={toggleDislike}
            >
              <ThumbsDown size={18} fill={isDisliked ? 'white' : 'none'} />
            </button>
            
            <div className="flex items-center gap-2">
              <button 
                className="p-2 text-white/70 hover:text-white transition-colors"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 accent-red-600 h-1"
              />
            </div>
            
            <button 
              className="p-2 text-white/70 hover:text-white transition-colors"
              onClick={() => setShowFullPlayer(true)}
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </div>
      )}
      
      {/* YouTube Player (hidden) */}
      <div className="hidden">
        {currentSong && youtubeApiReady && (
          <YouTube
            videoId={currentSong.id}
            key={`youtube-player-${playerRef.current || currentSong.id}`}
            opts={{
              playerVars: {
                autoplay: isPlaying ? 1 : 0,
                controls: 0,
                // Add parameters to improve playback reliability
                iv_load_policy: 3, // Hide annotations
                rel: 0, // Don't show related videos
                modestbranding: 1,
                origin: typeof window !== 'undefined' ? window.location.origin : undefined,
                enablejsapi: 1,
                playsinline: 1
              },
            }}
            onReady={onReady}
            onStateChange={onStateChange}
            onError={onPlayerError}
          />
        )}
      </div>

      {/* Add a retry button if there's an error */}
      {errorMessage && (
        <button 
          onClick={handleRetry}
          className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
        >
          Retry Playback
        </button>
      )}
    </div>
  );
} 