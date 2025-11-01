import pool from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get('season');
  
  if (!season) {
    return Response.json({ error: 'Season parameter required' }, { status: 400 });
  }

  try {
    const query = `
      SELECT DISTINCT
        d.name,
        t.name as team,
        s.position,
        s.points,
        COALESCE(s.position, 999) as sort_position
      FROM lineups l
      JOIN drivers d ON l.driver_id = d.id
      JOIN teams t ON l.team_id = t.id
      JOIN seasons se ON l.season_id = se.id
      LEFT JOIN standings s ON s.driver_id = d.id 
        AND s.season_id = se.id 
        AND s.type = 'drivers'
      WHERE se.season = $1
      ORDER BY sort_position, d.name
    `;
    
    const res = await pool.query(query, [season]);
    
    const drivers = res.rows.map(row => ({
      name: row.name,
      team: row.team,
      position: row.position ? `P${row.position}` : null,
      points: row.points || 0
    }));
    
    return Response.json({ drivers });
  } catch (error) {
    //DEBUG: console.error('Error fetching season drivers:', error);
    return Response.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}