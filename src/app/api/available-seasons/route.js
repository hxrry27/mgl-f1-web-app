// src/app/api/available-seasons/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Move computation logic to separate function
async function computeAvailableSeasonsFromDatabase() {
  console.log('🔍 Computing available seasons from database');
  
  const seasonsRes = await pool.query(`
    SELECT
      s.season,
      COUNT(DISTINCT r.id) as race_count
    FROM
      seasons s
    LEFT JOIN
      races r ON r.season_id = s.id
    GROUP BY
      s.season
    ORDER BY
      CAST(s.season AS INTEGER) DESC
  `);
 
  const seasons = seasonsRes.rows.map(row => row.season);
 
  console.log(`✅ Found ${seasons.length} seasons:`, seasons);
 
  return { seasons };
}

// Main API route - NO CACHING
export async function GET(request) {
  try {
    console.log('📡 Available seasons API called');
    const result = await computeAvailableSeasonsFromDatabase();
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error('❌ Error in available seasons API:', error);
    return NextResponse.json(
      { error: 'Failed to load seasons' },
      { status: 500 }
    );
  }
}