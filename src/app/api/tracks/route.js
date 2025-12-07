// app/api/tracks/route.js
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const res = await pool.query('SELECT slug FROM tracks ORDER BY slug ASC');
    return Response.json(res.rows);
  } catch (error) {
    //DEBUG: console.error('Error fetching tracks:', error);
    return Response.json({ error: 'Failed to fetch tracks' }, { status: 500 });
  }
}