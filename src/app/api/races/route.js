// src/app/api/races/route.js
import pool from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get('season') || '11'; // Default to Season 11

  try {
    const res = await pool.query(
      'SELECT track ' +
      'FROM schedule ' +
      'WHERE season = $1 ' +
      'ORDER BY date ASC',
      [season]
    );
    const races = res.rows.map(row => row.track);
    return new Response(JSON.stringify(races), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching races:', error);
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}