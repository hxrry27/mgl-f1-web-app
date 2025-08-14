'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Available seasons in descending order (most recent first)
const SEASONS = ['11', '10', '9', '8'];

// Default races for each season (last few races)
const RECENT_RACES = {
  '11': ['yas-marina', 'losail', 'las-vegas', 'interlagos', 'mexico'],
  '10': ['yas-marina', 'losail', 'las-vegas', 'interlagos', 'mexico'],
  '9': ['yas-marina', 'losail', 'las-vegas', 'interlagos', 'mexico'],
  '8': ['yas-marina', 'losail', 'las-vegas', 'interlagos', 'mexico']
};

async function findMostRecentRace() {
  try {
    // Try to fetch the most recent season from the API
    const seasonsResponse = await fetch('/api/seasons', { cache: 'no-store' });
    if (seasonsResponse.ok) {
      const seasonsData = await seasonsResponse.json();
      // If we get data, find the most recent season
      if (seasonsData.length > 0) {
        const mostRecentSeason = Math.max(...seasonsData.map(s => parseInt(s))).toString();
        
        // Now fetch races for that season to find the most recent race
        const racesResponse = await fetch(`/api/season-races?season=${mostRecentSeason}`, { cache: 'no-store' });
        if (racesResponse.ok) {
          const racesData = await racesResponse.json();
          if (racesData.races && racesData.races.length > 0) {
            // Get the last race (highest race_number) as the most recent
            const sortedRaces = racesData.races.sort((a, b) => b.race_number - a.race_number);
            const mostRecentRace = sortedRaces[0];
            return { season: mostRecentSeason, race: mostRecentRace.slug };
          }
        }
        
        // If no races found, use fallback race for that season
        const recentRaces = RECENT_RACES[mostRecentSeason] || ['bahrain'];
        return { season: mostRecentSeason, race: recentRaces[0] };
      }
    }
  } catch (error) {
    console.log('Could not fetch recent race data, using defaults');
  }
  
  // Fallback to defaults
  return { season: SEASONS[0], race: RECENT_RACES[SEASONS[0]][0] };
}

export default function ResultsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const redirectToMostRecent = async () => {
      const { season, race } = await findMostRecentRace();
      router.push(`/results/season/${season}/${race}`);
    };
    
    redirectToMostRecent();
  }, [router]);

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-3xl font-bold text-white text-center mb-4">Loading latest results...</h1>
        <div className="animate-pulse text-gray-400">Redirecting to most recent race</div>
      </div>
    </div>
  );
}