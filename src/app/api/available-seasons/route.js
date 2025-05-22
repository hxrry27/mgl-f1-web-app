// src/app/api/available-seasons/route.js
import { NextResponse } from 'next/server';
import { cachedApiResponse, getCacheKey, CACHE_DURATIONS } from '@/lib/cachedApi';
import pool from '@/lib/db';

// Move computation logic to separate function
async function computeAvailableSeasonsFromDatabase() {
  console.log('Computing available seasons from database');
  
  // Modified query to only get seasons with substantial telemetry data
  const seasonsRes = await pool.query(`
    SELECT
      s.season,
      COUNT(DISTINCT r.id) as race_count
    FROM
      seasons s
    JOIN
      races r ON r.season_id = s.id
    JOIN
      session_race_mapping srm ON srm.race_id = r.id
    GROUP BY
      s.season
    HAVING
      COUNT(DISTINCT r.id) >= 1  -- Only include seasons with at least 1 race
    ORDER BY
      CAST(s.season AS INTEGER) DESC
  `);
 
  const seasons = seasonsRes.rows.map(row => row.season);
 
  console.log(`Found ${seasons.length} seasons with telemetry data:`, seasons);
 
  return { seasons };
}

// Main API route with caching
export async function GET(request) {
  try {
    const cacheKey = getCacheKey.seasons();

    return cachedApiResponse(
      cacheKey,
      async () => {
        return await computeAvailableSeasonsFromDatabase();
      },
      CACHE_DURATIONS.SEASONS // 24 hours cache
    );

  } catch (error) {
    console.error('Error in available seasons API:', error);
    return NextResponse.json(
      { error: 'Failed to load seasons' },
      { status: 500 }
    );
  }
}