"use client"

import { useState, useEffect, createContext, ReactNode } from 'react';
import Navbar from "./ui/Navbar";
import MusicPlayer from "./player/MusicPlayer";
import SearchBar from "./ui/SearchBar";

// Define context for navbar state
export const NavbarContext = createContext({
  isCollapsed: false,
  toggleCollapse: () => {}
});

interface RootLayoutClientProps {
  children: ReactNode;
}

export default function RootLayoutClient({ children }: RootLayoutClientProps) {
  // Manage navbar collapsed state at layout level
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Initialize from localStorage on client side
  useEffect(() => {
    const savedState = localStorage.getItem('navbarCollapsed');
    if (savedState) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);
  
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('navbarCollapsed', String(newState));
  };

  return (
    <NavbarContext.Provider value={{ isCollapsed, toggleCollapse }}>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar Navigation */}
        <Navbar />
        
        {/* Main Content */}
        <main className={`flex-1 flex flex-col h-full overflow-hidden ${isCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
          {/* Header - includes search bar and user profile */}
          <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 bg-black z-10">
            {/* Search Bar */}
            <SearchBar />
            
            {/* User Profile */}
            <div className="flex items-center">
              <button className="mr-4 text-white/70 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <button className="bg-white/10 rounded-full h-8 w-8 flex items-center justify-center">
                <span className="text-sm font-medium">D</span>
              </button>
            </div>
          </header>
          
          {/* Content Area - with bottom padding for the player */}
          <div className="flex-1 overflow-y-auto pb-24 px-6">
            {children}
          </div>
        </main>
      </div>
      
      {/* Music Player */}
      <MusicPlayer />
    </NavbarContext.Provider>
  );
} 