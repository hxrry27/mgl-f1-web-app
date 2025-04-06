// src/app/api/season-races/route.js
import { NextResponse } from 'next/server';
// Import your existing pool
const pool = require('../../../lib/db');

export async function GET(request) {
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
    
    console.log(`Fetching races for season ${season}`);
    
    // Modified query to ONLY find races that have data in session_race_mapping
    const racesResult = await pool.query(`
      SELECT DISTINCT
        r.id,
        t.name,
        t.slug,
        r.date,
        r.race_number
      FROM
        races r
      JOIN
        tracks t ON r.track_id = t.id
      JOIN
        session_race_mapping srm ON srm.race_id = r.id
      WHERE
        r.season_id = $1
      ORDER BY
        r.race_number ASC
    `, [season]);
    
    // If no races found with session mappings, return empty array with a message
    if (racesResult.rows.length === 0) {
      console.log(`No races with telemetry data found for season ${season}`);
      
      return NextResponse.json({
        races: [],
        message: "No races with telemetry data found for this season"
      });
    }
    
    console.log(`Found ${racesResult.rows.length} races with telemetry data for season ${season}`);
    
    return NextResponse.json({
      races: racesResult.rows
    });
  } catch (error) {
    console.error('Error fetching season races:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}