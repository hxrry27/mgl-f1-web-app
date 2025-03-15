// src/app/api/next-race/route.js
import pool from '@/lib/db';

export async function GET() {
  try {
    const currentDate = new Date('2025-03-11'); // Use current date from context
    const res = await pool.query(
      'SELECT track, date ' +
      'FROM schedule ' +
      'WHERE date >= $1 ' +
      'ORDER BY date ASC ' +
      'LIMIT 1',
      [currentDate]
    );
    if (res.rows.length === 0) {
      return new Response(JSON.stringify({ track: 'bahrain', date: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const nextRace = res.rows[0];
    return new Response(JSON.stringify(nextRace), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching next race:', error);
    return new Response(JSON.stringify({ track: 'bahrain', date: null }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}