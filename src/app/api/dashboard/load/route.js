// src/app/api/dashboard/load/route.js
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
  const userId = searchParams.get('userId');
  const res = await pool.query('SELECT config FROM dashboards WHERE user_id = $1', [userId]);
  const config = res.rows[0]?.config || [];
  return new Response(JSON.stringify({ widgets: config }), { status: 200 });
}