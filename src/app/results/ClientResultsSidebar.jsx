'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MapPin } from 'lucide-react';

export default function ClientResultsSidebar({ season: initialSeason, races: initialRaces, trackNames }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const [races, setRaces] = useState(initialRaces);
  
  // Current season from URL
  const currentSeason = params.season || initialSeason;
  
  // Fetch races when season changes
  useEffect(() => {
    async function fetchRaces() {
      try {
        const response = await fetch(`/api/races?season=${currentSeason}`);
        const data = await response.json();
        setRaces(data);
      } catch (error) {
        console.error('Error fetching races:', error);
        setRaces(initialRaces); // Fallback to initial races
      }
    }
    fetchRaces();
  }, [currentSeason, initialRaces]);
  
  return (
    <div className="fixed top-16 left-0 w-60 h-[calc(100vh-4rem)] bg-gray-900/70 border-r border-gray-800 p-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-4 w-4 text-blue-500" />
        <h3 className="text-lg font-semibold">Season {currentSeason} Races</h3>
      </div>
      <Separator className="mb-4 bg-gray-800" />
      
      <nav className="space-y-1">
        {races.map((race) => (
          <button
            key={race}
            onClick={() => router.push(`/results/season/${currentSeason}/${race}`)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
              pathname === `/results/season/${currentSeason}/${race}` ? 
                "bg-gray-800 text-white" : 
                "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            {trackNames[race] || race.replace(/-/g, ' ')}
          </button>
        ))}
      </nav>
    </div>
  );
}