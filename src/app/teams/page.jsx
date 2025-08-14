'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { teams } from '@/lib/data';

// Function to normalize team names for URLs
const normalizeTeamName = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-');
};

export default function TeamsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the first team by default
    if (teams.length > 0) {
      router.push(`/teams/${normalizeTeamName(teams[0])}`);
    }
  }, [router]);

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <h1 className="text-3xl font-bold text-white text-center mb-8">Loading...</h1>
    </div>
  );
}