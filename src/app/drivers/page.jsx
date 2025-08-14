'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { drivers } from '@/lib/data';

// Function to normalize driver names for URLs
const normalizeDriverName = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-');
};

export default function DriversPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the first driver by default
    if (drivers.length > 0) {
      router.push(`/drivers/${normalizeDriverName(drivers[0])}`);
    }
  }, [router]);

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <h1 className="text-3xl font-bold text-white text-center mb-8">Loading...</h1>
    </div>
  );
}