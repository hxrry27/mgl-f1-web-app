import { NextResponse } from 'next/server';
const pool = require('@/lib/db');

export async function GET(request) {
  try {
    // Get search params from the URL
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season');
    const raceSlug = searchParams.get('raceSlug');
    const sessionType = searchParams.get('sessionType') || 'race';

    if (!season || !raceSlug) {
      return NextResponse.json(
        { message: 'Season and raceSlug are required' }, 
        { status: 400 }
      );
    }

    console.log(`Fetching damage data for season ${season}, race ${raceSlug}, session type ${sessionType}`);

    // 1. Get the race_id by joining races with tracks to find by track slug
    const raceResult = await pool.query(`
      SELECT r.id 
      FROM races r
      JOIN tracks t ON r.track_id = t.id
      WHERE r.season_id = $1 AND t.slug = $2
    `, [season, raceSlug]);

    if (raceResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Race not found' }, 
        { status: 404 }
      );
    }

    const raceId = raceResult.rows[0].id;
    console.log(`Found race ID: ${raceId}`);

    // 2. Get all session_uids for this race from the mapping table
    const sessionResult = await pool.query(
      'SELECT session_uid FROM session_race_mapping WHERE race_id = $1',
      [raceId]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'No telemetry session found for this race' }, 
        { status: 404 }
      );
    }

    // Get the list of all available sessions
    const sessionUids = sessionResult.rows.map(row => row.session_uid);
    console.log(`Found ${sessionUids.length} sessions for this race: ${sessionUids.join(', ')}`);

    // Select the appropriate session based on session type
    let sessionUid;
    if (sessionType === 'qualifying' && sessionUids.length > 0) {
      sessionUid = sessionUids[0];
    } else if (sessionType === 'race' && sessionUids.length > 1) {
      sessionUid = sessionUids[1];
    } else {
      sessionUid = sessionUids[sessionUids.length - 1];
    }

    console.log(`Selected session UID: ${sessionUid} for ${sessionType}`);

    // 3. Get the driver info from participants table
    const driversResult = await pool.query(`
      SELECT 
        p.car_index, 
        p.driver_name, 
        p.team_id, 
        t.name as team_name
      FROM 
        participants p
      LEFT JOIN 
        teams t ON p.team_id = t.id
      WHERE 
        p.session_uid = $1
      ORDER BY 
        p.car_index
    `, [sessionUid]);

    console.log(`Found ${driversResult.rows.length} drivers`);

    // Create driver mapping
    const driverMap = {};
    driversResult.rows.forEach(driver => {
      driverMap[driver.car_index] = {
        name: driver.driver_name,
        team: driver.team_name || 'Unknown Team'
      };
    });

    // 4. Get damage data from car_damage_data table
    const damageQuery = `
      SELECT
        car_index,
        session_time,
        front_left_wing_damage,
        front_right_wing_damage,
        rear_wing_damage,
        floor_damage,
        diffuser_damage,
        sidepod_damage,
        brakes_damage_rl,
        brakes_damage_rr,
        brakes_damage_fl,
        brakes_damage_fr
      FROM
        car_damage_data
      WHERE
        session_uid = $1
      ORDER BY
        car_index, session_time
    `;
    const damageResult = await pool.query(damageQuery, [sessionUid]);
    
    console.log(`Found ${damageResult.rows.length} damage data entries`);

    // Process damage data and add driver information
    const damageData = damageResult.rows.map(row => {
      const driver = driverMap[row.car_index] || { name: `Driver ${row.car_index}`, team: 'Unknown' };
      return {
        ...row,
        driver: driver.name,
        team: driver.team
      };
    });

    return NextResponse.json({ damageData });
  } catch (error) {
    console.error('Error fetching damage data:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message }, 
      { status: 500 }
    );
  }
}