'use client';

import React from 'react';
import Link from 'next/link';
import { Separator } from "@/components/ui/separator";
import Header from '@/components/Header';
import { teams } from '@/lib/data.js';
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation';

// Function to normalize team names for URLs
const normalizeTeamName = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-');
};

export default function TeamsLayout({ children }) {
  const pathname = usePathname();
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 bg-opacity-90 text-white">
      
      {/* Main Layout Container */}
      <div className="flex flex-grow">
        {/* Fixed Sidebar */}
        <div className="fixed top-16 left-0 w-60 h-[calc(100vh-4rem)] bg-gray-900/70 border-r border-gray-800 p-4 overflow-y-auto">
          <nav className="space-y-1">
            <div>
              <Link 
                href="/teams/lineups"
                className={cn(
                  "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === "/teams/lineups" ? 
                    "bg-gray-800 text-white" : 
                    "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                Lineups
              </Link>
            </div>
            
            <Separator className="my-2 bg-gray-800" />
            
            <div className="space-y-1">
              {teams.map((team) => (
                <Link 
                  key={team}
                  href={`/teams/${normalizeTeamName(team)}`}
                  className={cn(
                    "block px-3 py-1.5 rounded-md text-sm transition-colors",
                    pathname === `/teams/${normalizeTeamName(team)}` ? 
                      "bg-gray-800 text-white" : 
                      "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  {team}
                </Link>
              ))}
            </div>
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