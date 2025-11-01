// app/api/race-info/route.js
import { NextResponse } from 'next/server';
import { cachedApiResponse, getCacheKey, CACHE_DURATIONS } from '@/lib/cachedApi';

const pool = require('@/lib/db');

// Move your ENTIRE existing computation logic to this function
async function computeRaceInfoFromDatabase(season, raceSlug) {
  // 1. First get the race ID from the race slug and season
  const raceResult = await pool.query(`
    SELECT r.id
    FROM races r
    JOIN tracks t ON r.track_id = t.id
    WHERE r.season_id = $1 AND t.slug = $2
  `, [season, raceSlug]);

  if (raceResult.rows.length === 0) {
    throw new Error('Race not found');
  }

  const raceId = raceResult.rows[0].id;

  // 2. Get race results data (KEEP YOUR EXACT QUERY)
  const resultsRes = await pool.query(
    'SELECT rr.position, rr.adjusted_position, d.name AS driver, t.name AS team, rr.time_int, rr.fastest_lap_time_int, ' +
    'rr.grid_position, rr.penalty_secs_ingame, rr.post_race_penalty_secs, rr.stints_raw, rr.status ' +
    'FROM race_results rr ' +
    'JOIN drivers d ON rr.driver_id = d.id ' +
    'JOIN teams t ON rr.team_id = t.id ' +
    'WHERE rr.race_id = $1',
    [raceId]
  );

  if (resultsRes.rows.length === 0) {
    throw new Error('No results found for this race');
  }

  // 3. Process the data to get winner, pole sitter, and fastest lap (KEEP YOUR EXACT LOGIC)
  // Find race winner (position 1)
  const winner = resultsRes.rows.find(row => row.position === 1 || row.adjusted_position === 1);
 
  // Find pole sitter (grid_position 1)
  const poleSitter = resultsRes.rows.find(row => row.grid_position === 1);
 
  // Find fastest lap (minimum fastest_lap_time_int)
  const validFastestLaps = resultsRes.rows.filter(row => row.fastest_lap_time_int > 0);
  const fastestLap = validFastestLaps.length > 0
    ? validFastestLaps.reduce((prev, current) =>
        prev.fastest_lap_time_int < current.fastest_lap_time_int ? prev : current)
    : null;

  // 4. Format times into strings (MM:SS.mmm) (KEEP YOUR EXACT FUNCTION)
  const formatTime = (timeMs) => {
    if (!timeMs || timeMs <= 0) return '';
   
    const totalSeconds = timeMs / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
  };

  // 5. Format the response (KEEP YOUR EXACT FORMATTING)
  const response = {
    winner: winner ? {
      name: winner.driver,
      team: winner.team
    } : null,
   
    poleSitter: poleSitter ? {
      name: poleSitter.driver,
      team: poleSitter.team,
      time: '' // We don't have qualifying times in this query
    } : null,
   
    fastestLap: fastestLap ? {
      name: fastestLap.driver,
      team: fastestLap.team,
      time: formatTime(fastestLap.fastest_lap_time_int)
    } : null
  };

  return response;
}

// NEW: Your main API route with caching
export async function GET(request) {
  try {
    // Get search params from the URL
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season');
    const raceSlug = searchParams.get('raceSlug');

    if (!season || !raceSlug) {
      return NextResponse.json(
        { message: 'Season and raceSlug are required' },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = `raceinfo:${season}:${raceSlug}`;

    // Use cached API response wrapper
    return cachedApiResponse(
      cacheKey,
      async () => {
        // Call your existing computation function
        return await computeRaceInfoFromDatabase(season, raceSlug);
      },
      CACHE_DURATIONS.LAP_DATA // 6 hours cache
    );

  } catch (error) {
    //DEBUG: console.error('Error fetching race info:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}