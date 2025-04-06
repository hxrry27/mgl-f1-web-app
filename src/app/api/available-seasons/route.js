// src/app/api/available-seasons/route.js
import pool from '@/lib/db';

export async function GET(request) {
  try {
    // Modified query to only get seasons with substantial telemetry data
    const seasonsRes = await pool.query(`
      SELECT 
        s.season, 
        COUNT(DISTINCT r.id) as race_count
      FROM 
        seasons s
      JOIN 
        races r ON r.season_id = s.id
      JOIN 
        session_race_mapping srm ON srm.race_id = r.id
      GROUP BY 
        s.season
      HAVING 
        COUNT(DISTINCT r.id) >= 1  -- Only include seasons with at least 3 races
      ORDER BY 
        CAST(s.season AS INTEGER) DESC
    `);
    
    const seasons = seasonsRes.rows.map(row => row.season);
    
    console.log(`Found ${seasons.length} seasons with telemetry data:`, seasons);
    
    return Response.json({ seasons });
  } catch (error) {
    console.error('Error fetching available seasons:', error);
    return new Response(JSON.stringify({ error: 'Failed to load seasons' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}