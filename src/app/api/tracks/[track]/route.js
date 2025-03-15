// src/app/api/tracks/[track]/route.js
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

export async function GET(request, { params }) {
  const { track } = await params;

  try {
    // Fetch track info
    const trackQuery = `
      SELECT country, name, length, turns, first_grand_prix AS first_grand_prix, laps
      FROM tracks
      WHERE slug = $1
    `;
    const trackResult = await pool.query(trackQuery, [track]);
    const trackInfo = trackResult.rows[0] || {
      country: 'UNKNOWN',
      name: 'Unknown Circuit',
      length: 'N/A',
      turns: 'N/A',
      first_grand_prix: 'N/A',
      laps: 'N/A',
    };

    // Fetch historical results directly from results table
    const resultsQuery = `
      SELECT 
        s.season,
        d.name AS winner,
        t.name AS winner_team,
        rf.driver_name AS fastest_lap_driver,
        (rf.best_lap_time_ms::float / 1000)::text AS fastest_lap_time,
        rp.driver_name AS pole_driver,
        array_agg(r.driver_name ORDER BY r.position) FILTER (WHERE r.position <= 3) AS podium
      FROM races ra
      JOIN tracks tr ON ra.track_id = tr.id
      JOIN seasons s ON ra.season_id = s.id
      JOIN results r ON r.session_uid IN (
        SELECT session_uid FROM results WHERE session_uid IN (
          SELECT session_uid FROM results WHERE position = 1
        )
      )
      LEFT JOIN results rf ON rf.session_uid = r.session_uid AND rf.best_lap_time_ms = (
        SELECT MIN(best_lap_time_ms) FROM results WHERE session_uid = r.session_uid
      )
      LEFT JOIN results rp ON rp.session_uid = r.session_uid AND rp.grid_position = 1
      LEFT JOIN drivers d ON r.driver_name = d.name
      LEFT JOIN teams t ON r.team = t.name
      WHERE tr.slug = $1 AND r.position = 1
      GROUP BY s.season, d.name, t.name, rf.driver_name, rf.best_lap_time_ms, rp.driver_name
      ORDER BY s.season DESC
    `;
    const resultsResult = await pool.query(resultsQuery, [track]);
    const historicalResults = resultsResult.rows.map(row => ({
      season: row.season,
      winner: row.winner,
      team: row.winner_team || 'N/A',
      podium: row.podium.filter(Boolean),
      fastestLap: row.fastest_lap_driver ? `${row.fastest_lap_driver} (${row.fastest_lap_time || 'N/A'})` : 'N/A',
      pole: row.pole_driver || 'N/A',
      fastestLapData: row.fastest_lap_driver ? {
        driver: row.fastest_lap_driver,
        time: row.fastest_lap_time || 'N/A',
        season: row.season,
        team: row.winner_team || 'N/A',
      } : null,
    }));

    //console.log('Track API Response:', { trackInfo, historicalResults: historicalResults.slice(0, 3) });
    return new Response(JSON.stringify({ trackInfo, historicalResults }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Track API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}