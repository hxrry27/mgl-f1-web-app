// src/app/api/dashboard/save/route.js
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

export async function POST(req) {
  const { userId, widgets } = await req.json();
  await pool.query('INSERT INTO dashboards (user_id, config) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET config = $2', [userId, JSON.stringify(widgets)]);
  return new Response(JSON.stringify({ message: 'Dashboard saved' }), { status: 200 });
}