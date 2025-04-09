import { NextResponse } from 'next/server';
const pool = require('@/lib/db');

export async function GET(request) {
  try {
    // Get search params from the URL
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season');
    const raceSlug = searchParams.get('raceSlug');
    const sessionType = searchParams.get('sessionType') || 'race';
    const specificDriver = searchParams.get('driver'); // New parameter to fetch specific driver data

    if (!season || !raceSlug) {
      return NextResponse.json(
        { message: 'Season and raceSlug are required' }, 
        { status: 400 }
      );
    }

    console.log(`Fetching damage data for season ${season}, race ${raceSlug}, session type ${sessionType}`);
    if (specificDriver) {
      console.log(`Filtering for driver: ${specificDriver}`);
    }

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

    // New query to get a summary of damage by driver (efficiently determine who has damage)
    const driverDamageSummaryQuery = `
      SELECT
        car_index,
        MAX(front_left_wing_damage) as max_fl_wing,
        MAX(front_right_wing_damage) as max_fr_wing,
        MAX(rear_wing_damage) as max_rear_wing,
        MAX(floor_damage) as max_floor,
        MAX(diffuser_damage) as max_diffuser,
        MAX(sidepod_damage) as max_sidepod
      FROM
        car_damage_data
      WHERE
        session_uid = $1
      GROUP BY
        car_index
    `;
    
    const damageSummaryResult = await pool.query(driverDamageSummaryQuery, [sessionUid]);
    
    // Identify drivers with damage
    const driversWithDamage = [];
    damageSummaryResult.rows.forEach(row => {
      const driver = driverMap[row.car_index];
      if (!driver) return;
      
      // Check if any damage component is greater than zero
      const hasDamage = 
        (row.max_fl_wing > 0) || 
        (row.max_fr_wing > 0) || 
        (row.max_rear_wing > 0) || 
        (row.max_floor > 0) || 
        (row.max_diffuser > 0) || 
        (row.max_sidepod > 0);
      
      if (hasDamage) {
        driversWithDamage.push({
          name: driver.name,
          team: driver.team,
          car_index: row.car_index
        });
      }
    });
    
    console.log(`Found ${driversWithDamage.length} drivers with damage`);

    // 4. Get damage data - filter by driver if specified
    let damageQuery = `
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
    `;
    
    const queryParams = [sessionUid];
    
    // If a specific driver is requested, add that to the query
    if (specificDriver) {
      // Find the car_index for this driver
      const driverIndices = Object.entries(driverMap)
        .filter(([_, driver]) => driver.name === specificDriver)
        .map(([car_index]) => car_index);
      
      if (driverIndices.length > 0) {
        // Add car_index filter to query
        damageQuery += ` AND car_index IN (${driverIndices.join(',')})`;
        console.log(`Filtering for car indices: ${driverIndices.join(',')}`);
      }
    }
    
    damageQuery += ` ORDER BY car_index, session_time`;
    const damageResult = await pool.query(damageQuery, queryParams);
    
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

    return NextResponse.json({ 
      damageData,
      driversWithDamage // Include this new list in the response
    });
  } catch (error) {
    console.error('Error fetching damage data:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message }, 
      { status: 500 }
    );
  }
}