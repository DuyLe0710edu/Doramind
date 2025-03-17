"use client"

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  path: string;
}

export default function CategoryBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const categories: Category[] = [
    { id: 'podcasts', name: 'Podcasts', path: '/mood/podcasts' },
    { id: 'focus', name: 'Focus', path: '/mood/focus' },
    { id: 'sleep', name: 'Sleep', path: '/mood/sleep' },
    { id: 'relax', name: 'Relax', path: '/mood/relax' },
    { id: 'sad', name: 'Sad', path: '/mood/sad' },
    { id: 'romance', name: 'Romance', path: '/mood/romance' },
    { id: 'feelgood', name: 'Feel good', path: '/mood/feelgood' },
    { id: 'workout', name: 'Workout', path: '/mood/workout' },
    { id: 'energize', name: 'Energize', path: '/mood/energize' },
    { id: 'party', name: 'Party', path: '/mood/party' },
    { id: 'commute', name: 'Commute', path: '/mood/commute' },
    { id: 'chill', name: 'Chill', path: '/mood/chill' },
  ];
  
  const handleCategoryClick = (category: Category) => {
    setActiveCategory(category.id);
    router.push(category.path);
  };
  
  return (
    <div className="flex overflow-x-auto space-x-2 py-3 px-2 bg-black no-scrollbar">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => handleCategoryClick(category)}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeCategory === category.id
              ? 'bg-white text-black'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
} 