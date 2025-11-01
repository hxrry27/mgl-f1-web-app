// src/app/api/admin/results/route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const season = searchParams.get('season');
  const race = searchParams.get('race');

  try {
    const seasonRes = await pool.query('SELECT id FROM seasons WHERE season = $1', [season]);
    const seasonId = seasonRes.rows[0]?.id;
    if (!seasonId) throw new Error('Season not found');

    const raceRes = await pool.query(
      'SELECT r.id, t.name FROM races r JOIN tracks t ON r.track_id = t.id WHERE r.season_id = $1 AND t.slug = $2',
      [seasonId, race]
    );
    const raceData = raceRes.rows[0];
    if (!raceData) throw new Error('Race not found');

    const resultsRes = await pool.query(
      `SELECT 
        rr.id, 
        rr.position, 
        d.name AS driver, 
        t.name AS team, 
        rr.time_int, 
        rr.fastest_lap_time_int, 
        rr.grid_position, 
        rr.penalty_secs_ingame, 
        rr.stints_raw, 
        rr.status,
        rr.adjusted_position,
        rr.post_race_penalty_secs
      FROM race_results rr
      JOIN drivers d ON rr.driver_id = d.id
      JOIN teams t ON rr.team_id = t.id
      WHERE rr.race_id = $1
      ORDER BY rr.position`,
      [raceData.id]
    );

    return NextResponse.json({ results: resultsRes.rows, raceName: raceData.name });
  } catch (err) {
    //DEBUG: console.error('Error fetching race results:', err);
    return NextResponse.json({ error: 'Failed to load results' }, { status: 500 });
  }
}

export async function POST(req) {
    const { results } = await req.json();
  
    try {
      for (const result of results) {
        await pool.query(
          `UPDATE race_results
           SET adjusted_position = $1, post_race_penalty_secs = $2, status = $3
           WHERE id = $4`,
          [result.adjusted_position, result.post_race_penalty_secs, result.status, result.id]
        );
      }
      return NextResponse.json({ success: true });
    } catch (err) {
      //DEBUG: console.error('Error saving changes:', err);
      return NextResponse.json({ error: 'Failed to save changes' }, { status: 500 });
    }
  }