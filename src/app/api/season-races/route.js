// src/app/api/season-races/route.js
import { NextResponse } from 'next/server';
import { cachedApiResponse, getCacheKey, CACHE_DURATIONS } from '@/lib/cachedApi';

// Import your existing pool
const pool = require('../../../lib/db');

// Move computation logic to separate function
async function computeSeasonRacesFromDatabase(season) {
  console.log(`Computing races for season ${season}`);
 
  // Get season ID first
  const seasonResult = await pool.query(
    'SELECT id FROM seasons WHERE season = $1',
    [season]
  );
  
  if (seasonResult.rows.length === 0) {
    return {
      races: [],
      message: "Season not found"
    };
  }
  
  const seasonId = seasonResult.rows[0].id;
  
  // Get ALL races for the season, with information about whether they have results
  const racesResult = await pool.query(`
    SELECT 
      r.id,
      t.name,
      t.slug,
      r.date,
      r.race_number,
      CASE 
        WHEN srm.race_id IS NOT NULL THEN true
        WHEN rr.race_id IS NOT NULL THEN true
        ELSE false
      END as has_results
    FROM
      races r
    JOIN
      tracks t ON r.track_id = t.id
    LEFT JOIN
      session_race_mapping srm ON srm.race_id = r.id
    LEFT JOIN
      race_results rr ON rr.race_id = r.id
    WHERE
      r.season_id = $1
    GROUP BY r.id, t.name, t.slug, r.date, r.race_number, srm.race_id
    ORDER BY
      r.race_number ASC
  `, [seasonId]);

  console.log(`🔍 Database query returned ${racesResult.rows.length} races:`);
  console.log('Race details:', racesResult.rows.map(r => ({ 
    race_number: r.race_number, 
    name: r.name, 
    slug: r.slug,
    has_results: r.has_results
  })));
 
  if (racesResult.rows.length === 0) {
    console.log(`No races found for season ${season}`);
   
    return {
      races: [],
      message: "No races found for this season"
    };
  }
 
  console.log(`Found ${racesResult.rows.length} races for season ${season}`);
 
  return {
    races: racesResult.rows
  };
}

// Main API route with caching
export async function GET(request) {
  console.log('🚨🚨🚨 SEASON RACES API CALLED! 🚨🚨🚨');
  try {
    // Get search params from the URL
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season');
   
    if (!season) {
      return NextResponse.json(
        { message: 'Season parameter is required' },
        { status: 400 }
      );
    }

    const result = await computeSeasonRacesFromDatabase(season);
    return NextResponse.json(result);

    // // Generate cache key
    // const cacheKey = getCacheKey.races(season);

    // // Use cached API response wrapper
    // return cachedApiResponse(
    //   cacheKey,
    //   async () => {
    //     return await computeSeasonRacesFromDatabase(season);
    //   },
    //   CACHE_DURATIONS.RACES // 24 hours cache
    // );

  } catch (error) {
    console.error('Error in season races API:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}