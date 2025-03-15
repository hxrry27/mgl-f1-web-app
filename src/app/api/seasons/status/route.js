import { Pool } from 'pg';

const pool = new Pool({ user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432, });

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const season = searchParams.get('season');
  const res = await pool.query('SELECT status FROM seasons WHERE season = $1', [season]);
  return new Response(JSON.stringify({ status: res.rows[0]?.status || 'ongoing' }), { status: 200 });
}

export async function POST(req) {
  const { season, status } = await req.json();
  await pool.query('INSERT INTO seasons (season, status) VALUES ($1, $2) ON CONFLICT (season) DO UPDATE SET status = $2', [season, status]);
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}