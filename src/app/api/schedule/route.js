// src/app/api/schedule/route.js
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const season = searchParams.get('season');
  const track = searchParams.get('track');

  try {
    if (season && track) {
      const res = await pool.query(
        'SELECT date::text AS date, time::text AS time FROM schedule WHERE season = $1 AND track = $2 LIMIT 1',
        [season, track]
      );
      const result = {
        date: res.rows[0]?.date || 'TBD',
        time: res.rows[0]?.time || '19:00:00',
      };
      //console.log('Single Race Response:', result);
      return new Response(JSON.stringify(result), { status: 200 });
    } else if (season) {
      const res = await pool.query(
        'SELECT id, season, track, date::text AS date, time::text AS time FROM schedule WHERE season = $1 ORDER BY date',
        [season]
      );
      const result = { schedule: res.rows };
      //console.log('Season Response:', result);
      return new Response(JSON.stringify(result), { status: 200 });
    } else {
      const res = await pool.query(
        'SELECT id, season, track, date::text AS date, time::text AS time FROM schedule ' +
        'WHERE season = (SELECT MAX(season::int)::text FROM schedule) ' +
        'ORDER BY date'
      );
      const result = { schedule: res.rows };
      //console.log('Latest Season Response:', result);
      return new Response(JSON.stringify(result), { status: 200 });
    }
  } catch (error) {
    console.error('Schedule fetch error:', error);
    return new Response(JSON.stringify({ schedule: [] }), { status: 500 });
  }
}