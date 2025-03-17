"use client"

import { useContext } from 'react';
import Link from 'next/link';
import { Home, Search, Library, Heart, History, Plus, Menu, ArrowLeft } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { NavbarContext } from '@/app/components/RootLayoutClient';

export default function Navbar() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse } = useContext(NavbarContext);

  const isActive = (path: string) => {
    return pathname === path;
  };

  // Check if we're on home page (either / or /home)
  const isHomePage = pathname === '/' || pathname === '/home';

  const playlists = [
    { id: 'liked-songs', name: 'Liked Songs', path: '/liked-songs' },
    { id: 'discover', name: 'Discover Weekly', path: '/playlist/discover' },
    { id: 'release', name: 'New Releases', path: '/playlist/release' },
    { id: 'summer', name: 'Summer Hits 2023', path: '/playlist/summer' },
    { id: 'chill', name: 'Chill Vibes', path: '/playlist/chill' },
    { id: 'workout', name: 'Workout Mix', path: '/playlist/workout' },
  ];

  return (
    <>
      {/* Overlay to capture clicks when navbar is expanded on mobile */}
      {!isCollapsed && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={toggleCollapse}
        ></div>
      )}
      
      <nav 
        className={`${
          isCollapsed ? 'w-16' : 'w-64'
        } bg-black h-full border-r border-white/10 flex flex-col overflow-hidden fixed left-0 top-0 z-50 transition-all duration-300`}
      >
        {/* Toggle Button */}
        <button 
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <Menu size={20} /> : <ArrowLeft size={20} />}
        </button>
        
        {/* Logo */}
        <div className={`px-6 py-4 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" className="w-8 h-8 mr-2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-3.5v-7l6 3.5-6 3.5z" />
          </svg>
          {!isCollapsed && <span className="text-white font-semibold text-xl">Music</span>}
        </div>

        {/* Main Navigation */}
        <div className="mt-2 flex-grow overflow-y-auto">
          <div className="px-2">
            <Link 
              href="/home" 
              className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg transition-colors ${
                isHomePage ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Home size={22} className={isCollapsed ? '' : 'mr-5'} />
              {!isCollapsed && <span className="text-sm font-medium">Home</span>}
            </Link>

            <Link 
              href="/explore" 
              className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg transition-colors ${
                isActive('/explore') ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Search size={22} className={isCollapsed ? '' : 'mr-5'} />
              {!isCollapsed && <span className="text-sm font-medium">Explore</span>}
            </Link>

            <Link 
              href="/library" 
              className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg transition-colors ${
                isActive('/library') ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Library size={22} className={isCollapsed ? '' : 'mr-5'} />
              {!isCollapsed && <span className="text-sm font-medium">Library</span>}
            </Link>
            
            <Link 
              href="/history" 
              className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg transition-colors ${
                isActive('/history') ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <History size={22} className={isCollapsed ? '' : 'mr-5'} />
              {!isCollapsed && <span className="text-sm font-medium">History</span>}
            </Link>

            <Link 
              href="/liked-songs" 
              className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg transition-colors ${
                isActive('/liked-songs') ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Heart size={22} className={isCollapsed ? '' : 'mr-5'} color={isActive('/liked-songs') ? 'white' : isCollapsed ? 'white' : '#ec4899'} fill={isCollapsed ? 'none' : '#ec4899'} />
              {!isCollapsed && <span className="text-sm font-medium">Liked Songs</span>}
            </Link>
          </div>
          
          {!isCollapsed && (
            <div className="mt-6 px-6">
              <button className="flex items-center text-white/70 hover:text-white font-medium text-sm mb-4">
                <Plus size={18} className="mr-2" />
                <span>New playlist</span>
              </button>
              
              <div className="mt-2">
                <h3 className="text-xs font-semibold uppercase text-white/40 tracking-wider mb-3 px-1">Your Playlists</h3>
                <div className="space-y-1">
                  {playlists.map((playlist) => (
                    <Link
                      key={playlist.id}
                      href={playlist.path}
                      className="block text-sm text-white/70 hover:text-white truncate py-2 px-1"
                    >
                      {playlist.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
} 