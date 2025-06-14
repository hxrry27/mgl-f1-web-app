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
    // Try to fetch the most recent race from the API
    const response = await fetch('/api/seasons', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      // If we get data, use the most recent season and a default race
      if (data.length > 0) {
        const mostRecentSeason = Math.max(...data.map(s => parseInt(s.season))).toString();
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