import pool from '@/lib/db';

export async function GET() {
  const res = await pool.query('SELECT season FROM seasons ORDER BY CAST(season AS INTEGER) DESC');
  return Response.json(res.rows.map(row => row.season));
}