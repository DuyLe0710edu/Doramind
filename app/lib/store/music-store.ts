import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VideoItem } from '../utils/youtube-api';

interface MusicState {
  // Currently playing
  currentSong: VideoItem | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  
  // Queue
  queue: VideoItem[];
  queueIndex: number;
  
  // User data
  likedSongs: VideoItem[];
  recentlyPlayed: VideoItem[];
  playlists: {
    id: string;
    name: string;
    songs: VideoItem[];
  }[];
  
  // UI state
  showLyrics: boolean;
  showQueue: boolean;
  
  // Navigation history
  history: VideoItem[];
  
  // Actions
  setCurrentSong: (song: VideoItem) => void;
  togglePlay: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  
  addToQueue: (song: VideoItem) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  
  skipToNext: () => void;
  skipToPrevious: () => void;
  
  likeSong: (song: VideoItem) => void;
  unlikeSong: (songId: string) => void;
  
  addToRecentlyPlayed: (song: VideoItem) => void;
  
  createPlaylist: (name: string) => string;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, song: VideoItem) => void;
  removeFromPlaylist: (playlistId: string, songId: string) => void;
  
  toggleLyrics: () => void;
  toggleQueue: () => void;
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSong: null,
      isPlaying: false,
      volume: 80,
      currentTime: 0,
      duration: 0,
      
      queue: [],
      queueIndex: -1,
      
      likedSongs: [],
      recentlyPlayed: [],
      playlists: [],
      
      showLyrics: false,
      showQueue: false,
      
      history: [],
      
      // Actions
      setCurrentSong: (song) => {
        const { currentSong, history } = get();
        
        if (currentSong) {
          // Add current song to history before changing
          set({
            history: [...history, currentSong].slice(-20),
            currentSong: song,
            isPlaying: true
          });
        } else {
          set({ currentSong: song, isPlaying: true });
        }
        
        get().addToRecentlyPlayed(song);
      },
      
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setVolume: (volume) => set({ volume }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      
      addToQueue: (song) => set((state) => ({ 
        queue: [...state.queue, song] 
      })),
      
      removeFromQueue: (index) => set((state) => ({ 
        queue: state.queue.filter((_, i) => i !== index) 
      })),
      
      clearQueue: () => set({ queue: [] }),
      
      playNext: () => {
        const { queue, queueIndex } = get();
        if (queueIndex < queue.length - 1) {
          const nextIndex = queueIndex + 1;
          set({ 
            queueIndex: nextIndex,
            currentSong: queue[nextIndex],
            isPlaying: true,
            currentTime: 0
          });
          get().addToRecentlyPlayed(queue[nextIndex]);
        }
      },
      
      playPrevious: () => {
        const { queue, queueIndex } = get();
        if (queueIndex > 0) {
          const prevIndex = queueIndex - 1;
          set({ 
            queueIndex: prevIndex,
            currentSong: queue[prevIndex],
            isPlaying: true,
            currentTime: 0
          });
        }
      },
      
      skipToNext: () => {
        const { queue, currentSong, history } = get();
        
        if (queue.length > 0) {
          // Get the next song from the queue and remove it
          const nextSong = queue[0];
          const newQueue = queue.slice(1);
          
          // Add current song to history if it exists
          if (currentSong) {
            set({
              history: [...history, currentSong].slice(-20),
              currentSong: nextSong,
              queue: newQueue,
              isPlaying: true,
              currentTime: 0
            });
          } else {
            set({
              currentSong: nextSong,
              queue: newQueue,
              isPlaying: true,
              currentTime: 0
            });
          }
          
          get().addToRecentlyPlayed(nextSong);
        } else {
          // If no songs in queue, continue playing current song
          // Could optionally stop playing: set({ isPlaying: false });
        }
      },
      
      skipToPrevious: () => {
        const { history, currentSong, queue, currentTime } = get();
        
        // If we're more than 3 seconds into a song, restart it
        if (currentTime > 3) {
          set({ currentTime: 0 });
          // We don't have direct access to the player here
          // Player seeking will be handled in the MusicPlayer component
          return;
        }
        
        if (history.length > 0) {
          // Get the last song from history
          const prevSong = history[history.length - 1];
          const newHistory = history.slice(0, -1);
          
          // Add current song to beginning of queue if it exists
          if (currentSong) {
            set({
              currentSong: prevSong,
              history: newHistory,
              queue: [currentSong, ...queue],
              isPlaying: true,
              currentTime: 0
            });
          } else {
            set({
              currentSong: prevSong,
              history: newHistory,
              isPlaying: true,
              currentTime: 0
            });
          }
          
          get().addToRecentlyPlayed(prevSong);
        }
      },
      
      likeSong: (song) => set((state) => {
        // Only add if not already liked
        if (!state.likedSongs.some(s => s.id === song.id)) {
          return { likedSongs: [...state.likedSongs, song] };
        }
        return state;
      }),
      
      unlikeSong: (songId) => set((state) => ({ 
        likedSongs: state.likedSongs.filter(song => song.id !== songId) 
      })),
      
      addToRecentlyPlayed: (song) => set((state) => {
        // Remove song if it's already in the list to avoid duplicates
        const filteredRecent = state.recentlyPlayed.filter(s => s.id !== song.id);
        
        // Add to beginning of array and limit to 50 songs
        return { 
          recentlyPlayed: [song, ...filteredRecent].slice(0, 50)
        };
      }),
      
      createPlaylist: (name) => {
        const id = `playlist_${Date.now()}`;
        set((state) => ({ 
          playlists: [...state.playlists, { id, name, songs: [] }] 
        }));
        return id;
      },
      
      deletePlaylist: (id) => set((state) => ({ 
        playlists: state.playlists.filter(playlist => playlist.id !== id) 
      })),
      
      addToPlaylist: (playlistId, song) => set((state) => ({
        playlists: state.playlists.map(playlist => 
          playlist.id === playlistId
            ? { ...playlist, songs: [...playlist.songs, song] }
            : playlist
        )
      })),
      
      removeFromPlaylist: (playlistId, songId) => set((state) => ({
        playlists: state.playlists.map(playlist => 
          playlist.id === playlistId
            ? { ...playlist, songs: playlist.songs.filter(song => song.id !== songId) }
            : playlist
        )
      })),
      
      toggleLyrics: () => set((state) => ({ showLyrics: !state.showLyrics })),
      toggleQueue: () => set((state) => ({ showQueue: !state.showQueue })),
    }),
    {
      name: 'youtube-music-storage',
      partialize: (state) => ({
        likedSongs: state.likedSongs,
        recentlyPlayed: state.recentlyPlayed.slice(0, 20), // Only store 20 recently played
        playlists: state.playlists,
        volume: state.volume,
      }),
    }
  )
); 