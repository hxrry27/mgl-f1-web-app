// app/api/schedule/next-race/route.js
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

export async function GET() {
  try {
    // Get current date in the format YYYY-MM-DD
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Query to get the next upcoming race from the schedule
    const query = `
      SELECT id, season, track, date, time 
      FROM schedule 
      WHERE date >= $1 
      ORDER BY date ASC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [currentDate]);
    
    if (result.rows.length > 0) {
      // Return the next race data
      return NextResponse.json(result.rows[0]);
    } else {
      // If no upcoming races found, get the earliest race (for next season)
      const fallbackQuery = `
        SELECT id, season, track, date, time 
        FROM schedule 
        ORDER BY date ASC 
        LIMIT 1
      `;
      
      const fallbackResult = await pool.query(fallbackQuery);
      
      if (fallbackResult.rows.length > 0) {
        return NextResponse.json(fallbackResult.rows[0]);
      } else {
        // No races found at all
        return NextResponse.json({ track: 'bahrain', date: null });
      }
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}