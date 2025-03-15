// src/app/api/results/[season]/[race]/route.js
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

export async function GET(req, { params }) {
  const { season, race } = await params;
  try {
    const res = await pool.query(
      'SELECT rr.position, d.name AS driver, t.name AS team, rr.time_int AS total_race_time, ' +
      'rr.fastest_lap_time_int::float / 1000 AS fastest_lap, (rr.grid_position - rr.position) AS positions_changed, ' +
      'rr.penalty_secs_ingame AS penalties ' +
      'FROM race_results rr ' +
      'JOIN races r ON rr.race_id = r.id ' +
      'JOIN seasons s ON r.season_id = s.id ' +
      'JOIN tracks t ON r.track_id = t.id ' +
      'JOIN drivers d ON rr.driver_id = d.id ' +
      'WHERE s.season = $1 AND t.slug = $2 ' +
      'ORDER BY rr.position',
      [season, race]
    );

    const winnerTime = res.rows[0]?.total_race_time || 0;
    const formattedResults = res.rows.map(row => ({
      position: row.position,
      driver: row.driver,
      team: row.team,
      gap: row.position === 1 ? 'Winner' : `+${((row.total_race_time - winnerTime) / 1000).toFixed(3)}`,
      fastest_lap: row.fastest_lap ? row.fastest_lap.toFixed(3) : 'N/A',
      positions_changed: row.positions_changed,
      penalties: row.penalties ? `${row.penalties}s` : 'None',
    }));

    //console.log('API Response:', formattedResults.slice(0, 3)); // Log top 3
    return new Response(JSON.stringify(formattedResults), { status: 200 });
  } catch (error) {
    console.error('Results fetch error:', error);
    return new Response(JSON.stringify({ message: 'Failed to fetch results' }), { status: 500 });
  }
}