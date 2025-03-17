"use client"

import { useState } from 'react';
import { Search, User } from 'lucide-react';

const categories = [
  "Podcasts", "Focus", "Sleep", "Relax", "Sad", 
  "Romance", "Feel Good", "Workout", "Energize", "Party", "Commute"
];

export default function TopNav() {
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="sticky top-0 z-10 bg-ytmusic-dark/95 backdrop-blur-sm border-b border-white/5">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Search Bar */}
          <div className="relative w-1/3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-white/50" />
            </div>
            <input
              type="text"
              className="w-full py-2 pl-10 pr-4 rounded-full bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="Search songs, albums, artists, podcasts"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-4">
            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <User size={18} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-6 pb-2 overflow-x-auto">
        <div className="flex space-x-2 pb-2 w-max">
          {categories.map((category) => (
            <button key={category} className="category-chip">
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 