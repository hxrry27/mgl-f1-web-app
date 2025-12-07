import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT id, season, track, date, time 
      FROM schedule 
      WHERE date < $1 
      ORDER BY date DESC 
      LIMIT 1
    `;

    const result = await pool.query(query, [today]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No completed races found' }, { status: 404 });
    }

    const race = result.rows[0];

    return NextResponse.json({
      season: race.season,
      slug: race.track,
      date: race.date,
      time: race.time
    });
  } catch (error) {
    //DEBUG: console.error('Error fetching latest race:', error);
    return NextResponse.json({ error: 'Failed to fetch latest race' }, { status: 500 });
  }
}