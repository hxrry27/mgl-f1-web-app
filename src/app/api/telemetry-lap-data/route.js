// Modified API endpoint for telemetry data that pre-filters by lap

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

    // 4. Get all lap data for this driver to determine lap boundaries
    const lapDataQuery = `
      SELECT 
        lap_number, 
        car_index,
        lap_time_ms,
        created_at
      FROM 
        lap_data
      WHERE 
        session_uid = $1 
        AND car_index = $2
      ORDER BY 
        created_at
    `;
    const lapDataResult = await pool.query(lapDataQuery, [sessionUid, carIndex]);
    
    if (lapDataResult.rows.length === 0) {
      console.log(`No lap data available for car ${carIndex}, cannot segment laps`);
      
      // Return an error or perhaps all telemetry as a single lap
      return NextResponse.json(
        { message: 'No lap data available to segment telemetry' },
        { status: 404 }
      );
    }
    
    // 5. Determine lap boundaries using a simpler, more reliable approach
    let startBoundary, endBoundary;

    // Find the last entry of the previous lap (lap-1) - that's our start boundary
    if (lap > 1) {
      const prevLapEntries = lapDataResult.rows.filter(row => row.lap_number === lap-1);
      if (prevLapEntries.length > 0) {
        // Last entry of previous lap marks start of current lap
        startBoundary = new Date(prevLapEntries[prevLapEntries.length-1].created_at);
      } else {
        // If no previous lap entries found, use first entry of current lap and subtract time
        const currentLapEntries = lapDataResult.rows.filter(row => row.lap_number === lap);
        if (currentLapEntries.length > 0) {
          const firstCurrentEntry = currentLapEntries[0];
          startBoundary = new Date(new Date(firstCurrentEntry.created_at).getTime() - 90000);
        } else {
          // Fallback if no current lap entries found
          return NextResponse.json(
            { message: `No lap data found for lap ${lap}` },
            { status: 404 }
          );
        }
      }
    } else {
      // For lap 1, estimate start time before first lap 1 entry
      const firstLapEntries = lapDataResult.rows.filter(row => row.lap_number === 1);
      if (firstLapEntries.length > 0) {
        // Start 90 seconds before first lap timestamp
        startBoundary = new Date(new Date(firstLapEntries[0].created_at).getTime() - 90000);
      } else {
        return NextResponse.json(
          { message: 'No lap 1 data found' },
          { status: 404 }
        );
      }
    }

    // Find the last entry of current lap - that's our end boundary
    const currentLapEntries = lapDataResult.rows.filter(row => row.lap_number === lap);
    if (currentLapEntries.length > 0) {
      // Last entry of current lap marks end of current lap
      endBoundary = new Date(currentLapEntries[currentLapEntries.length-1].created_at);
    } else {
      return NextResponse.json(
        { message: `No entries found for lap ${lap}` },
        { status: 404 }
      );
    }

    console.log(`====== LAP BOUNDARY DETAILS ======`);
    console.log(`Lap ${lap} start: ${startBoundary.toISOString()}`);
    console.log(`Lap ${lap} end: ${endBoundary.toISOString()}`);
    console.log(`================================`);

    // 6. Get track length if available
    let trackLength = 5000; // Default 5km fallback
    try {
      const trackResult = await pool.query(`
        SELECT t.length
        FROM tracks t
        JOIN races r ON r.track_id = t.id
        WHERE r.id = $1
      `, [raceId]);
      
      if (trackResult.rows.length > 0 && trackResult.rows[0].length) {
        trackLength = (trackResult.rows[0].length) * 1000;
        console.log(`Using actual track length: ${trackLength}m`);
      }
    } catch (error) {
      console.warn('Could not fetch track length, using default 5000m:', error);
    }
    
    // 7. Get telemetry data within these lap boundaries
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
        created_at
      FROM
        car_telemetry_data
      WHERE
        session_uid = $1
        AND car_index = $2
        AND created_at >= $3
        AND created_at <= $4
      ORDER BY
        created_at
    `;
    
    const telemetryResult = await pool.query(telemetryQuery, [
      sessionUid, 
      carIndex, 
      startBoundary, 
      endBoundary 
    ]);
    
    console.log(`Found ${telemetryResult.rows.length} telemetry data points for lap ${lap}`);
    
    // 8. Process telemetry data to add normalized distance within the lap
    const lapTelemetry = telemetryResult.rows.map((point, index, array) => {
      // Calculate percentage through the lap based on time
      const pointTime = new Date(point.created_at).getTime();
      const lapDuration = endBoundary.getTime() - startBoundary.getTime();
      const timeFromStart = pointTime - startBoundary.getTime();
      const percentThroughLap = timeFromStart / lapDuration;
      
      // Use actual track length for distance calculation
      const distance = percentThroughLap * trackLength;
      
      return {
        ...point,
        lap_number: lap,
        distance: distance,
        percentage: percentThroughLap * 100, // 0-100%
        track_length: trackLength // Include track length in response
      };
    });
    
    // Force the last point to be at the track end
    if (lapTelemetry.length > 0) {
      lapTelemetry[lapTelemetry.length - 1].distance = trackLength;
    }

    // 9. Return the processed telemetry data for the specific lap
    return NextResponse.json({ 
      lapTelemetry: lapTelemetry,
      lapInfo: currentLapEntries[0], // First entry of the current lap
      driver: driverName,
      lap: lap,
      boundaries: {
        start: startBoundary.toISOString(),
        end: endBoundary.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching telemetry data:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message }, 
      { status: 500 }
    );
  }
}