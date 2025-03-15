import pool from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get('season');
  const res = await pool.query(
    'SELECT l.id, d.name AS driver, t.name AS team ' +
    'FROM lineups l ' +
    'JOIN drivers d ON l.driver_id = d.id ' +
    'JOIN teams t ON l.team_id = t.id ' +
    'JOIN seasons s ON l.season_id = s.id ' +
    'WHERE s.season = $1 ' +
    'ORDER BY t.name, d.name',
    [season]
  );
  return Response.json(res.rows);
}

export async function POST(request) {
  const { season, driver, team } = await request.json();
  const seasonRes = await pool.query('SELECT id FROM seasons WHERE season = $1', [season]);
  const driverRes = await pool.query('SELECT id FROM drivers WHERE name = $1', [driver]);
  const teamRes = await pool.query('SELECT id FROM teams WHERE name = $1', [team]);

  const seasonId = seasonRes.rows[0]?.id;
  const driverId = driverRes.rows[0]?.id;
  const teamId = teamRes.rows[0]?.id;

  if (!seasonId || !driverId || !teamId) return Response.json({ error: 'Invalid data' }, { status: 400 });

  await pool.query(
    'INSERT INTO lineups (season_id, driver_id, team_id) VALUES ($1, $2, $3)',
    [seasonId, driverId, teamId]
  );
  return Response.json({ success: true });
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  await pool.query('DELETE FROM lineups WHERE id = $1', [id]);
  return Response.json({ success: true });
}