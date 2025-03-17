"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Library, Heart, Music, Clock, Podcast, Plus } from 'lucide-react';

export default function SideNav() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path;
  };

  const navigationItems = [
    { name: 'Home', icon: <Home size={22} />, path: '/' },
    { name: 'Explore', icon: <Compass size={22} />, path: '/explore' },
    { name: 'Library', icon: <Library size={22} />, path: '/library' },
  ];

  const libraryItems = [
    { name: 'Liked Music', icon: <Heart size={22} />, path: '/liked' },
    { name: 'Karaoke', icon: <Music size={22} />, path: '/karaoke' },
    { name: 'Recently Played', icon: <Clock size={22} />, path: '/recently-played' },
    { name: 'Episodes for Later', icon: <Podcast size={22} />, path: '/episodes-later' },
  ];

  return (
    <aside className="h-full w-64 bg-ytmusic-dark border-r border-white/5 overflow-auto">
      <div className="py-6">
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2">
            <svg height="24" viewBox="0 0 24 24" width="24" className="text-white">
              <path d="M10 9.35L15 12l-5 2.65zM12 7a5 5 0 105 5 5 5 0 00-5-5m0-1a6 6 0 11-6 6 6 6 0 016-6zm0-3a9 9 0 109 9 9 9 0 00-9-9m0-1A10 10 0 112 12 10 10 0 0112 2z" fill="currentColor"></path>
            </svg>
            <span className="text-xl font-semibold text-white">YouTube Music</span>
          </div>
        </div>

        <nav className="space-y-1 mb-8 px-2">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className={`navigation-item ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="px-6 mb-2">
          <button className="w-full flex items-center gap-2 py-2 px-4 bg-white/10 hover:bg-white/20 rounded-md transition-colors text-white">
            <Plus size={18} />
            <span>New Playlist</span>
          </button>
        </div>

        <div className="px-4 py-2 text-sm font-medium text-white/50">
          Library
        </div>

        <nav className="space-y-1 px-2">
          {libraryItems.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className={`navigation-item ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
} 