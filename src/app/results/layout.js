// src/app/results/layout.jsx
import { Box } from '@mui/material';
import pool from '@/lib/db';
import Header from '@/components/Header';
import ClientResultsSidebar from './ClientResultsSidebar';

// Map slugs to full track names (same as in page.jsx)
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
  'portimao' : 'Portugal',
  'paul-ricard' : 'France'
  // Add more as needed
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#0a0e27',
        color: 'white',
      }}
    >
      {/* Fixed Header */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
        }}
      >
        <Header />
      </Box>

      {/* Main Layout Container */}
      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          pt: '128px', // Header height (32px banner + 64px header)
          overflow: 'hidden',
        }}
    >
        <ClientResultsSidebar season={season} races={races} trackNames={trackNames} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            ml: '240px',
            p: 2,
            backgroundColor: '#0a0e27',
            overflowY: 'auto',
            overflowX: 'hidden',
            height: 'calc(100vh - 128px)',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export const dynamic = 'force-dynamic';