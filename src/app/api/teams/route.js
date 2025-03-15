import pool from '@/lib/db';

export async function GET() {
  const res = await pool.query('SELECT name FROM teams ORDER BY name');
  return Response.json(res.rows.map(row => row.name));
}