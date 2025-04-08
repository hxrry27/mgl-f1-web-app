// Updated /app/api/track-details/route.js

import { NextResponse } from 'next/server';
const pool = require('@/lib/db');

export async function GET(request) {
  try {
    // Get search params from the URL
    const { searchParams } = new URL(request.url);
    const raceSlug = searchParams.get('raceSlug');

    if (!raceSlug) {
      return NextResponse.json(
        { message: 'Race slug is required' }, 
        { status: 400 }
      );
    }

    console.log(`Fetching track details for race: ${raceSlug}`);

    // Get the track details by joining tracks with races
    const trackResult = await pool.query(`
      SELECT 
        t.id, 
        t.name, 
        t.country,
        t.length,
        t.turns,
        t.laps,
        t.slug
      FROM 
        tracks t
      JOIN 
        races r ON r.track_id = t.id
      WHERE 
        t.slug = $1
      LIMIT 1
    `, [raceSlug]);

    if (trackResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Track not found' }, 
        { status: 404 }
      );
    }

    const track = trackResult.rows[0];
    
    // Convert length from kilometers to meters
    if (track.length) {
      track.length_meters = track.length * 1000;
    } else {
      // Default to 5km if no length available
      track.length_meters = 5000;
    }

    console.log(`Found track: ${track.name}, Length: ${track.length_meters}m`);

    return NextResponse.json({ track });
  } catch (error) {
    console.error('Error fetching track details:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message }, 
      { status: 500 }
    );
  }
}