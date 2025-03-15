import pool from '@/lib/db';

export async function GET() {
  const res = await pool.query(
    'SELECT DISTINCT d.name ' +
    'FROM drivers d ' +
    'JOIN race_results rr ON rr.driver_id = d.id ' +
    'JOIN races r ON rr.race_id = r.id ' +
    'JOIN seasons s ON r.season_id = s.id ' +
    'WHERE CAST(s.season AS INTEGER) >= 6 ' +
    'ORDER BY d.name'
  );
  return Response.json(res.rows.map(row => row.name));
}