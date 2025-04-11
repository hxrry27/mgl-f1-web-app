import React from 'react';
import Header from '@/components/Header';
import ClientResultsSidebar from './ClientResultsSidebar';
import pool from '@/lib/db';

// Map slugs to full track names
const trackNames = {
  'bahrain': 'Bahrain',
  'jeddah': 'Saudi Arabia',
  'yas-marina': 'Abu Dhabi',
  'melbourne': 'Australia',
  'suzuka': 'Japan',
  'shanghai': 'China',
  'baku': 'Azerbaijan',
  'miami': 'Miami',
  'monaco': 'Monaco',
  'montreal': 'Canada',
  'barcelona': 'Spain',
  'spielberg': 'Austria',
  'silverstone': 'Great Britain',
  'hungaroring': 'Hungary',
  'spa-francorchamps': 'Belgium',
  'zandvoort': 'Netherlands',
  'monza': 'Italy',
  'singapore': 'Singapore',
  'austin': 'Texas',
  'mexico': 'Mexico',
  'interlagos': 'Brazil',
  'las-vegas': 'Las Vegas',
  'losail': 'Qatar',
  'imola': 'Emilia-Romagna',
  'portimao': 'Portugal',
  'paul-ricard': 'France'
};

async function getRacesForSeason(season) {
  try {
    const res = await pool.query(
      'SELECT track ' +
      'FROM schedule ' +
      'WHERE season = $1 ' +
      'ORDER BY date ASC',
      [season]
    );
    return res.rows.map(row => row.track);
  } catch (error) {
    console.error('Error fetching races for season:', error);
    return [];
  }
}

export default async function ResultsLayout({ children, params }) {
  const season = params.season || '11'; // Default to Season 11
  const races = await getRacesForSeason(season);
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 bg-opacity-90 text-white">      
      {/* Main Layout Container */}
      <div className="flex flex-grow">
        <ClientResultsSidebar season={season} races={races} trackNames={trackNames} />
        
        {/* Main Content */}
        <div className="flex-grow ml-60 p-6 overflow-y-auto min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';