"use client"

import { useState, useEffect } from 'react';
import { Search, Mic, X, History, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const router = useRouter();

  // Load search history on component mount
  useEffect(() => {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Add to search history (avoid duplicates and keep most recent at the top)
      const updatedHistory = [
        query,
        ...searchHistory.filter(item => item.toLowerCase() !== query.toLowerCase())
      ].slice(0, 5); // Limit to 5 items
      
      setSearchHistory(updatedHistory);
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
      
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setShowHistory(false);
    }
  };

  const selectHistoryItem = (item: string) => {
    setQuery(item);
    router.push(`/search?q=${encodeURIComponent(item)}`);
    setShowHistory(false);
  };

  const clearSearch = () => {
    setQuery('');
    setShowHistory(true); // Show history when clearing
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  return (
    <div className="flex-1 max-w-xl relative">
      <form onSubmit={handleSearch} className="relative">
        <div className={`flex items-center bg-white/10 rounded-full overflow-hidden transition-all ${
          isFocused ? 'ring-2 ring-white/30' : ''
        }`}>
          <span className="pl-4 text-white/60">
            <Search size={20} />
          </span>
          <input
            type="text"
            placeholder="Search songs, albums, artists, podcasts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setShowHistory(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              // Delay hiding history to allow clicking
              setTimeout(() => setShowHistory(false), 200);
            }}
            className="w-full bg-transparent py-2 px-3 text-sm text-white placeholder-white/60 focus:outline-none"
          />
          {query && (
            <button 
              type="button" 
              onClick={clearSearch}
              className="text-white/60 hover:text-white p-2"
            >
              <X size={18} />
            </button>
          )}
          <button 
            type="button"
            className="text-white/60 hover:text-white p-3 border-l border-white/10"
            aria-label="Voice search"
          >
            <Mic size={18} />
          </button>
        </div>
      </form>
      
      {/* Search History Dropdown */}
      {showHistory && searchHistory.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 rounded-md shadow-lg z-50 border border-gray-700">
          <div className="flex justify-between items-center p-2 border-b border-gray-700">
            <span className="text-sm text-gray-400 flex items-center">
              <History size={14} className="mr-2" /> Recent searches
            </span>
            <button
              onClick={clearHistory}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Clear all
            </button>
          </div>
          <ul>
            {searchHistory.map((item, index) => (
              <li 
                key={index}
                className="px-4 py-2 hover:bg-gray-800 cursor-pointer flex items-center text-white"
                onClick={() => selectHistoryItem(item)}
              >
                <Clock size={14} className="mr-3 text-gray-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 