import { NextResponse } from 'next/server';
const pool = require('@/lib/db');

export async function GET(request) {
  try {
    // Get search params from the URL
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season');
    const raceSlug = searchParams.get('raceSlug');
    const sessionType = searchParams.get('sessionType') || 'race';
    const lap = parseInt(searchParams.get('lap') || '1', 10);
    const driverName = searchParams.get('driver');

    if (!season || !raceSlug) {
      return NextResponse.json(
        { message: 'Season and raceSlug are required' }, 
        { status: 400 }
      );
    }

    console.log(`Fetching telemetry data for season ${season}, race ${raceSlug}, session type ${sessionType}, lap ${lap}, driver ${driverName}`);

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

    // Find the car index for the requested driver
    let carIndex = null;
    if (driverName) {
      const driverRecord = driversResult.rows.find(
        d => d.driver_name.toUpperCase() === driverName.toUpperCase()
      );
      if (driverRecord) {
        carIndex = driverRecord.car_index;
        console.log(`Found car index ${carIndex} for driver ${driverName}`);
      }
    }

    // If no specific driver requested or found, use the first driver
    if (carIndex === null && driversResult.rows.length > 0) {
      carIndex = driversResult.rows[0].car_index;
      console.log(`Using default car index ${carIndex}`);
    }

    if (carIndex === null) {
      return NextResponse.json(
        { message: 'No drivers found for this session' }, 
        { status: 404 }
      );
    }

    // 4. First, get lap data information to understand the lap boundaries
    // This will help us identify which telemetry data points belong to the requested lap
    const lapDataQuery = `
      SELECT 
        lap_number, 
        car_index,
        lap_time_ms
      FROM 
        lap_data
      WHERE 
        session_uid = $1 
        AND car_index = $2
      ORDER BY 
        lap_number
    `;
    const lapDataResult = await pool.query(lapDataQuery, [sessionUid, carIndex]);
    
    if (lapDataResult.rows.length === 0) {
      console.log(`No lap data available for car ${carIndex}, fetching general telemetry`);
      
      // If no lap data found, just get some telemetry data for this driver
      const telemetryQuery = `
        SELECT
          car_index,
          session_time,
          speed,
          throttle,
          steer,
          brake,
          clutch,
          gear,
          engine_rpm,
          drs
        FROM
          car_telemetry_data
        WHERE
          session_uid = $1
          AND car_index = $2
        ORDER BY
          session_time
        LIMIT 1000
      `;
      
      const telemetryResult = await pool.query(telemetryQuery, [sessionUid, carIndex]);
      
      console.log(`Found ${telemetryResult.rows.length} general telemetry data points`);
      return NextResponse.json({ telemetryData: telemetryResult.rows });
    }
    
    // Now we have lap data, but we need to determine the time range of the requested lap
    // Since we don't have direct start/end times in lap_data, we'll use a different approach
    
    // 5. Get all telemetry data for this driver and filter by lap later on the frontend
    const telemetryQuery = `
      SELECT
        car_index,
        session_time,
        speed,
        throttle,
        steer,
        brake,
        clutch,
        gear,
        engine_rpm,
        drs,
        frame_identifier
      FROM
        car_telemetry_data
      WHERE
        session_uid = $1
        AND car_index = $2
      ORDER BY
        session_time
      LIMIT 10000
    `;
    
    const telemetryResult = await pool.query(telemetryQuery, [sessionUid, carIndex]);
    console.log(`Found ${telemetryResult.rows.length} telemetry data points for driver ${driverName}`);
    
    // Return both lap data and telemetry data so the client can do the lap filtering
    return NextResponse.json({ 
      telemetryData: telemetryResult.rows,
      lapData: lapDataResult.rows,
      requestedLap: lap
    });
  } catch (error) {
    console.error('Error fetching telemetry data:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message }, 
      { status: 500 }
    );
  }
}