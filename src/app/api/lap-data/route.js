// File at: /app/api/lap-data/route.js
import pool from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const seasonParam = searchParams.get('season');
  const raceSlug = searchParams.get('raceSlug');
 
  if (!seasonParam || !raceSlug) {
    return Response.json({ error: 'Season and race slug are required' }, { status: 400 });
  }
  
  try {
    // First, get the race ID for the given slug and season
    const raceRes = await pool.query(
      'SELECT r.id FROM races r ' +
      'JOIN tracks t ON r.track_id = t.id ' +
      'JOIN seasons s ON r.season_id = s.id ' +
      'WHERE s.season = $1 AND t.slug = $2',
      [seasonParam, raceSlug]
    );
   
    if (raceRes.rows.length === 0) {
      return Response.json({ error: 'Race not found' }, { status: 404 });
    }
   
    const raceId = raceRes.rows[0].id;
   
    // Get all teams
    const teamsRes = await pool.query(
      'SELECT id, name FROM teams'
    );
   
    // Create team mapping
    const teams = {};
    teamsRes.rows.forEach(team => {
      teams[team.id] = team.name;
    });
   
    // Get driver-team mapping for this specific race from race_results
    const driverTeamRes = await pool.query(
      'SELECT DISTINCT d.id AS driver_id, d.name AS driver_name, rr.team_id ' +
      'FROM race_results rr ' +
      'JOIN drivers d ON rr.driver_id = d.id ' +
      'WHERE rr.race_id = $1',
      [raceId]
    );
   
    // Create driver to team mapping
    const driverTeamMap = {};
    driverTeamRes.rows.forEach(row => {
      driverTeamMap[row.driver_id] = {
        name: row.driver_name,
        team_id: row.team_id,
        team_name: teams[row.team_id] || 'Unknown Team'
      };
    });
   
    // Get all lap times for this race - joining with the driver team mapping
    const lapTimesRes = await pool.query(
      'SELECT ' +
      '  d.id AS driver_id, ' +
      '  d.name AS driver, ' +
      '  lt.lap_number, ' +
      '  lt.lap_time_int, ' +
      '  lt.tyre_compound ' +
      'FROM lap_times lt ' +
      'JOIN drivers d ON lt.driver_id = d.id ' +
      'WHERE lt.race_id = $1 ' +
      'AND lt.lap_time_int > 0 ' + // Exclude invalid lap times
      'ORDER BY d.name, lt.lap_number',
      [raceId]
    );
   
    // Enhance lap data with team information
    const enhancedLapData = lapTimesRes.rows.map(lap => {
      const driverInfo = driverTeamMap[lap.driver_id] || { team_id: null, team_name: 'Unknown Team' };
      return {
        ...lap,
        team_id: driverInfo.team_id,
        team: driverInfo.team_name
      };
    });
   
    // Format driver list with team info
    const drivers = Object.values(driverTeamMap).map(driver => ({
      id: driver.driver_id,
      name: driver.name,
      team_id: driver.team_id,
      team: driver.team_name
    }));

    // NEW CODE: Get stint data from race_results
    const stintDataRes = await pool.query(
      'SELECT ' +
      '  d.id AS driver_id, ' +
      '  d.name AS driver_name, ' +
      '  rr.stints_raw ' +
      'FROM race_results rr ' +
      'JOIN drivers d ON rr.driver_id = d.id ' +
      'WHERE rr.race_id = $1 ' +
      'AND rr.stints_raw IS NOT NULL',  // Only get records with stint data
      [raceId]
    );
    
    // Process stint data into a driver-keyed object
    const stintData = {};
    stintDataRes.rows.forEach(row => {
      if (row.stints_raw) {
        stintData[row.driver_name] = row.stints_raw;
      }
    });
   
    return Response.json({
      raceId,
      drivers,
      teams: teamsRes.rows,
      lapData: enhancedLapData,
      stintData: stintData  // Include stint data in the response
    });
   
  } catch (error) {
    console.error('Error fetching lap data:', error);
    return Response.json({ error: 'Failed to load lap data', details: error.message }, { status: 500 });
  }
}