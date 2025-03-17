"use client"

import { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface MusicSectionProps {
  title: string;
  subtitle?: string;
  moreLink?: string;
  actionButton?: ReactNode;
  children: ReactNode;
}

export default function MusicSection({ 
  title, 
  subtitle, 
  moreLink, 
  actionButton,
  children 
}: MusicSectionProps) {
  return (
    <section className="mb-8 px-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center">
          {actionButton && <div className="mr-4">{actionButton}</div>}
          {moreLink && (
            <Link 
              href={moreLink} 
              className="text-sm text-gray-400 group flex items-center hover:text-white transition-colors"
            >
              See all
              <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {children}
      </div>
    </section>
  );
} 