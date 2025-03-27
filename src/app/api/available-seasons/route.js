import pool from '@/lib/db';

export async function GET(request) {
  try {
    // Fixed query using GROUP BY instead of DISTINCT with ORDER BY
    const seasonsRes = await pool.query(
      'SELECT s.season FROM seasons s ' +
      'JOIN races r ON r.season_id = s.id ' +
      'JOIN lap_times lt ON lt.race_id = r.id ' +
      'GROUP BY s.season ' +  // Using GROUP BY instead of DISTINCT
      'ORDER BY CAST(s.season AS INTEGER) DESC'
    );
    
    const seasons = seasonsRes.rows.map(row => row.season);
    
    return Response.json({ seasons });
  } catch (error) {
    console.error('Error fetching available seasons:', error);
    return new Response(JSON.stringify({ error: 'Failed to load seasons' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}