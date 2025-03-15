import { Pool } from 'pg';

const pool = new Pool({ user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432, });

export async function POST(req) {
  const { season, tracks } = await req.json();
  await pool.query('INSERT INTO seasons (season, status) VALUES ($1, $2) ON CONFLICT (season) DO UPDATE SET status = $2', [season, 'ongoing']);
  for (const { track, date } of tracks) {
    await pool.query('INSERT INTO schedule (season, track, date) VALUES ($1, $2, $3)', [season, track, date]);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}