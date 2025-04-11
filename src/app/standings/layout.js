'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import Header from '@/components/Header';

const seasons = [...Array(11)].map((_, i) => i + 1); // Seasons 1-11

export default function StandingsLayout({ children }) {
  const pathname = usePathname();
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 bg-opacity-90 text-white">
      
      {/* Main Layout Container */}
      <div className="flex flex-grow">
        {/* Fixed Sidebar */}
        <div className="fixed top-16 left-0 w-60 h-[calc(100vh-4rem)] bg-gray-900/70 border-r border-gray-800 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-2">Standings</h3>
          <Separator className="mb-4 bg-gray-800" />
          
          <nav className="space-y-1">
            <Link 
              href="/standings/season/overall"
              className={cn(
                "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === "/standings/season/overall" ? 
                  "bg-gray-800 text-white" : 
                  "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              All-Time
            </Link>
            
            {seasons.map((season) => (
              <Link 
                key={season}
                href={`/standings/season/${season}`}
                className={cn(
                  "block px-3 py-1.5 rounded-md text-sm transition-colors",
                  pathname === `/standings/season/${season}` ? 
                    "bg-gray-800 text-white" : 
                    "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                Season {season}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-grow ml-60 p-6 overflow-y-auto min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}