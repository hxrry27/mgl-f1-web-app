import pool from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get('season');
  
  if (!season) {
    return Response.json({ error: 'Season parameter required' }, { status: 400 });
  }

  try {
    const query = `
      SELECT 
        t.name,
        COUNT(DISTINCT l.driver_id) as driver_count,
        ARRAY_AGG(DISTINCT d.name) as drivers,
        s.points
      FROM lineups l
      JOIN teams t ON l.team_id = t.id
      JOIN drivers d ON l.driver_id = d.id
      JOIN seasons se ON l.season_id = se.id
      LEFT JOIN standings s ON s.team_id = t.id 
        AND s.season_id = se.id 
        AND s.type = 'constructors'
      WHERE se.season = $1
      GROUP BY t.name, s.points, s.position
      ORDER BY COALESCE(s.position, 999), t.name
    `;
    
    const res = await pool.query(query, [season]);
    
    const teams = res.rows.map(row => ({
      name: row.name,
      driver_count: parseInt(row.driver_count),
      drivers: row.drivers,
      points: row.points || 0
    }));
    
    return Response.json({ teams });
  } catch (error) {
    console.error('Error fetching season teams:', error);
    return Response.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}