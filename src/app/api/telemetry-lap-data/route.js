// src/app/api/telemetry-lap-data/route.js
import { NextResponse } from 'next/server';
import { cachedApiResponse, getCacheKey, CACHE_DURATIONS } from '@/lib/cachedApi';

const pool = require('@/lib/db');

// Move your entire computation logic to this function
async function computeTelemetryFromDatabase(season, raceSlug, sessionType, lap, driverName) {
  //DEBUG: console.log(`Computing telemetry data for season ${season}, race ${raceSlug}, session type ${sessionType}, lap ${lap}, driver ${driverName}`);

  // 1. Common setup code - Get race information
  const raceResult = await pool.query(`
    SELECT r.id 
    FROM races r
    JOIN tracks t ON r.track_id = t.id
    WHERE r.season_id = $1 AND t.slug = $2
  `, [season, raceSlug]);

  if (raceResult.rows.length === 0) {
    throw new Error('Race not found');
  }

  const raceId = raceResult.rows[0].id;
  //DEBUG: console.log(`Found race ID: ${raceId}`);

  // 2. Get session information
  const sessionResult = await pool.query(
    'SELECT session_uid FROM session_race_mapping WHERE race_id = $1',
    [raceId]
  );

  if (sessionResult.rows.length === 0) {
    throw new Error('No telemetry session found for this race');
  }

  const sessionUids = sessionResult.rows.map(row => row.session_uid);
  //DEBUG: console.log(`Found ${sessionUids.length} sessions for this race: ${sessionUids.join(', ')}`);

  let sessionUid;
  if (sessionType === 'qualifying' && sessionUids.length > 0) {
    sessionUid = sessionUids[0];
  } else if (sessionType === 'race' && sessionUids.length > 1) {
    sessionUid = sessionUids[1];
  } else {
    sessionUid = sessionUids[sessionUids.length - 1];
  }
  
  console.log(`Selected session UID: ${sessionUid} for ${sessionType}`);

  // 3. Get driver information
  const driversResult = await pool.query(`
    SELECT p.car_index, p.driver_name, p.team_id, t.name as team_name
    FROM participants p
    LEFT JOIN teams t ON p.team_id = t.id
    WHERE p.session_uid = $1
    ORDER BY p.car_index
  `, [sessionUid]);

  //DEBUG: console.log(`Found ${driversResult.rows.length} drivers`);

  let carIndex = null;
  if (driverName) {
    const driverRecord = driversResult.rows.find(d => d.driver_name.toUpperCase() === driverName.toUpperCase());
    if (driverRecord) {
      carIndex = driverRecord.car_index;
      //DEBUG: console.log(`Found car index ${carIndex} for driver ${driverName}`);
    }
  }

  if (carIndex === null && driversResult.rows.length > 0) {
    carIndex = driversResult.rows[0].car_index;
    //DEBUG: console.log(`Using default car index ${carIndex}`);
  }

  if (carIndex === null) {
    throw new Error('No drivers found for this session');
  }

  // 4. Get track length
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
      //DEBUG: console.log(`Using actual track length: ${trackLength}m`);
    }
  } catch (error) {
    //DEBUG: console.warn('Could not fetch track length, using default 5000m:', error);
  }

  // 5. CHECK IF FRAME_IDENTIFIER IS AVAILABLE FOR THIS RACE ID
  const frameIdentifierCheck = await pool.query(`
    SELECT COUNT(*) as has_frames 
    FROM lap_data 
    WHERE session_uid = $1 
      AND frame_identifier IS NOT NULL 
    LIMIT 1
  `, [sessionUid]);
  
  const hasFrameIdentifier = frameIdentifierCheck.rows.length > 0 && 
                             frameIdentifierCheck.rows[0].has_frames > 0;
  
  //DEBUG: console.log(`Race ID ${raceId} ${hasFrameIdentifier ? 'HAS' : 'DOES NOT HAVE'} frame_identifier data`);

  let lapTelemetry;
  
  // 6. BRANCH INTO APPROPRIATE DATA PROCESSING METHOD
  if (hasFrameIdentifier) {
    // ====== NEW METHOD: USING FRAME_IDENTIFIER ======
    //DEBUG: console.log("Using frame_identifier-based mapping for this race");
    
    // Get lap data for the requested lap
    const lapDataQuery = `
      SELECT ld.lap_number, ld.car_index, ld.lap_time_ms, ld.created_at, ld.frame_identifier 
      FROM lap_data ld
      WHERE ld.session_uid = $1 
        AND ld.car_index = $2 
        AND ld.lap_number = $3
      ORDER BY ld.created_at
    `;
    
    const lapDataResult = await pool.query(lapDataQuery, [sessionUid, carIndex, lap]);
    
    if (lapDataResult.rows.length === 0) {
      throw new Error(`No lap data found for lap ${lap}`);
    }
    
    // Get frame identifiers for this lap
    const frameIds = lapDataResult.rows.map(row => row.frame_identifier).filter(id => id !== null);
    
    if (frameIds.length === 0) {
      //DEBUG: console.log("No valid frame identifiers found, falling back to timestamp method");
      // Fall back to timestamp method if no valid frame IDs
      return getLegacyTimestampMethod();
    }
    
    // Get telemetry data matching these frame identifiers
    const telemetryQuery = `
      SELECT ctd.*
      FROM car_telemetry_data ctd
      WHERE ctd.session_uid = $1
        AND ctd.car_index = $2
        AND ctd.frame_identifier IN (${frameIds.map((_, i) => `$${i + 3}`).join(',')})
      ORDER BY ctd.created_at
    `;
    
    const telemetryParams = [sessionUid, carIndex, ...frameIds];
    const telemetryResult = await pool.query(telemetryQuery, telemetryParams);
    
    //DEBUG: console.log(`Found ${telemetryResult.rows.length} telemetry data points for lap ${lap} using frame_identifier`);
    
    if (telemetryResult.rows.length === 0) {
      //DEBUG: console.log("No telemetry data found with frame identifiers, falling back to timestamp method");
      // Fall back to timestamp method if no telemetry data found
      return getLegacyTimestampMethod();
    }
    
    // Process telemetry data to add normalized distance
    const startTime = new Date(telemetryResult.rows[0]?.created_at || 0).getTime();
    const endTime = new Date(telemetryResult.rows[telemetryResult.rows.length-1]?.created_at || 0).getTime();
    const lapDuration = endTime - startTime;
    
    lapTelemetry = telemetryResult.rows.map((point, index, array) => {
      const pointTime = new Date(point.created_at).getTime();
      const timeFromStart = pointTime - startTime;
      const percentThroughLap = timeFromStart / lapDuration;
      
      return {
        ...point,
        lap_number: lap,
        distance: percentThroughLap * trackLength,
        percentage: percentThroughLap * 100,
        track_length: trackLength
      };
    });
    
    // Force last point to track end
    if (lapTelemetry.length > 0) {
      lapTelemetry[lapTelemetry.length - 1].distance = trackLength;
    }
    
    // Log the boundaries
    //DEBUG: console.log(`====== LAP BOUNDARY DETAILS (FRAME IDENTIFIER) ======`);
    //DEBUG: console.log(`Lap ${lap} has ${frameIds.length} frame identifiers`);
    //DEBUG: console.log(`Lap ${lap} time boundaries: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
    //DEBUG: console.log(`================================================`);
    
  } else {
    // Call the legacy timestamp method
    return getLegacyTimestampMethod();
  }
  
  // Internal function for the legacy timestamp method
  async function getLegacyTimestampMethod() {
    // ====== LEGACY METHOD: USING TIMESTAMPS ======
    //DEBUG: console.log("Using timestamp-based mapping for this race (legacy method)");
    
    // Get all lap data for this driver
    const lapDataQuery = `
      SELECT lap_number, car_index, lap_time_ms, created_at
      FROM lap_data
      WHERE session_uid = $1 
        AND car_index = $2
      ORDER BY created_at
    `;
    
    const lapDataResult = await pool.query(lapDataQuery, [sessionUid, carIndex]);
    
    if (lapDataResult.rows.length === 0) {
      throw new Error('No lap data available');
    }
    
    // Determine lap boundaries using last entry of each lap
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
          throw new Error(`No lap data found for lap ${lap}`);
        }
      }
    } else {
      // For lap 1, estimate start time before first lap 1 entry
      const firstLapEntries = lapDataResult.rows.filter(row => row.lap_number === 1);
      if (firstLapEntries.length > 0) {
        // Start 90 seconds before first lap timestamp
        startBoundary = new Date(new Date(firstLapEntries[0].created_at).getTime() - 90000);
      } else {
        throw new Error('No lap 1 data found');
      }
    }

    // Find the last entry of current lap - that's our end boundary
    const currentLapEntries = lapDataResult.rows.filter(row => row.lap_number === lap);
    if (currentLapEntries.length > 0) {
      // Last entry of current lap marks end of current lap
      endBoundary = new Date(currentLapEntries[currentLapEntries.length-1].created_at);
    } else {
      throw new Error(`No entries found for lap ${lap}`);
    }

    //DEBUG: console.log(`====== LAP BOUNDARY DETAILS (TIMESTAMP) ======`);
    //DEBUG: console.log(`Lap ${lap} start: ${startBoundary.toISOString()}`);
    //DEBUG: console.log(`Lap ${lap} end: ${endBoundary.toISOString()}`);
    //DEBUG: console.log(`============================================`);

    // Get telemetry data within these lap boundaries
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
    
    //DEBUG: console.log(`Found ${telemetryResult.rows.length} telemetry data points for lap ${lap} using timestamp method`);
    
    // Process telemetry data to add normalized distance
    lapTelemetry = telemetryResult.rows.map((point, index, array) => {
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
        percentage: percentThroughLap * 100,
        track_length: trackLength
      };
    });
    
    // Force the last point to be at the track end
    if (lapTelemetry.length > 0) {
      lapTelemetry[lapTelemetry.length - 1].distance = trackLength;
    }
    
    return {
      lapTelemetry: lapTelemetry,
      driver: driverName,
      lap: lap,
      track_length: trackLength,
      data_source: 'timestamp',
      race_id: raceId
    };
  }

  // 7. Return the processed telemetry data in a consistent format
  return { 
    lapTelemetry: lapTelemetry,
    driver: driverName,
    lap: lap,
    track_length: trackLength,
    data_source: hasFrameIdentifier ? 'frame_identifier' : 'timestamp',
    race_id: raceId
  };
}

// NEW: Your main API route - now super simple with caching!
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

    // Generate cache key
    const cacheKey = getCacheKey.telemetry(season, raceSlug, sessionType, lap, driverName);

    // Use cached API response wrapper
    return cachedApiResponse(
      cacheKey,
      async () => {
        // Call your existing computation function
        return await computeTelemetryFromDatabase(season, raceSlug, sessionType, lap, driverName);
      },
      CACHE_DURATIONS.TELEMETRY // 6 hours cache
    );

  } catch (error) {
    //DEBUG: console.error('Error in telemetry API:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message }, 
      { status: 500 }
    );
  }
}