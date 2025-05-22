// /api/track-dominance/route.js
import { NextResponse } from 'next/server';
const pool = require('@/lib/db');
import { trackSlugToName } from '@/constants/f1Constants';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season');
    const raceSlug = searchParams.get('raceSlug');
    const sessionType = searchParams.get('sessionType') || 'race';
    
    console.log(`Track dominance API called for: ${season}/${raceSlug}/${sessionType}`);
    
    // First, find the race ID using the same approach as your telemetry API
    const raceResult = await pool.query(`
      SELECT r.id 
      FROM races r
      JOIN tracks t ON r.track_id = t.id
      WHERE r.season_id = $1 AND t.slug = $2
    `, [season, raceSlug]);

    // Declare raceId variable
    let raceId;

    if (raceResult.rows.length === 0) {
      // Try the secondary lookup if direct slug lookup fails
      console.log(`No race found with direct slug lookup, trying mapped name lookup`);
      
      // Try to map the slug to a known track name
      let trackName = trackSlugToName[raceSlug];
      if (!trackName) {
        console.log(`No mapping found for slug: ${raceSlug}`);
        return NextResponse.json({ message: 'Race not found' }, { status: 404 });
      }
      
      // Try again with the mapped track name
      const secondaryRaceResult = await pool.query(`
        SELECT r.id 
        FROM races r
        JOIN tracks t ON r.track_id = t.id
        WHERE r.season_id = $1 AND (
          LOWER(t.name) LIKE LOWER($2) 
          OR LOWER(t.name) LIKE LOWER('%' || $2 || '%')
        )
      `, [season, trackName]);
      
      if (secondaryRaceResult.rows.length === 0) {
        return NextResponse.json({ message: 'Race not found' }, { status: 404 });
      }
      
      // Use the first match
      raceId = secondaryRaceResult.rows[0].id;
    } else {
      // Use the direct match
      raceId = raceResult.rows[0].id;
    }
    
    console.log(`Found race ID: ${raceId}`);
    
    // Get session UID using the same approach as your telemetry API
    const sessionResult = await pool.query(
      'SELECT session_uid FROM session_race_mapping WHERE race_id = $1',
      [raceId]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ message: 'No telemetry session found for this race' }, { status: 404 });
    }

    const sessionUids = sessionResult.rows.map(row => row.session_uid);
    console.log(`Found ${sessionUids.length} sessions for this race: ${sessionUids.join(', ')}`);

    let sessionUid;
    if (sessionType === 'qualifying' && sessionUids.length > 0) {
      sessionUid = sessionUids[0];
    } else if (sessionType === 'race' && sessionUids.length > 1) {
      sessionUid = sessionUids[1];
    } else {
      sessionUid = sessionUids[sessionUids.length - 1];
    }
    
    console.log(`Selected session UID: ${sessionUid} for ${sessionType}`);
    
    // Get driver information
    const driversResult = await pool.query(`
      SELECT p.car_index, p.driver_name, p.team_id, t.name as team_name
      FROM participants p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.session_uid = $1
      ORDER BY p.car_index
    `, [sessionUid]);

    console.log(`Found ${driversResult.rows.length} drivers`);
    
    const driverMap = {};
    driversResult.rows.forEach(row => {
      driverMap[row.car_index] = {
        name: row.driver_name,
        team: row.team_name || 'Unknown Team',
        car_index: row.car_index
      };
    });
    
    // Get track length
    let trackLength = 5000; // Default 5km fallback
    try {
      const trackResult = await pool.query(`
        SELECT t.length, t.name
        FROM tracks t
        JOIN races r ON r.track_id = t.id
        WHERE r.id = $1
      `, [raceId]);
      
      if (trackResult.rows.length > 0) {
        const trackInfo = trackResult.rows[0];
        if (trackInfo.length) {
          trackLength = trackInfo.length * 1000; // Convert to meters
          console.log(`Using actual track length: ${trackLength}m for ${trackInfo.name}`);
        }
      }
    } catch (error) {
      console.warn('Could not fetch track length, using default 5000m:', error);
    }
    
    // Check available columns in car_motion_data
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'car_motion_data'
      ORDER BY column_name;
    `;
    
    console.log('Checking available columns in car_motion_data table...');
    const columnsResult = await pool.query(columnsQuery);
    const availableColumns = columnsResult.rows.map(row => row.column_name);
    console.log(`Available motion data columns: ${availableColumns.join(', ')}`);
    
    // Check for speed column
    const hasSpeedColumn = availableColumns.includes('speed');
    
    // Get track layout data
    console.log('Fetching track layout data...');
    const trackLayoutQuery = `
      SELECT 
        cmd.car_index,
        cmd.world_position_x as worldPosx,
        cmd.world_position_y as worldPosy,
        cmd.session_time,
        ROW_NUMBER() OVER (PARTITION BY cmd.car_index ORDER BY cmd.session_time) * 50 as track_distance
      FROM car_motion_data cmd
      WHERE cmd.session_uid = $1 
        AND cmd.car_index = 0
        AND cmd.world_position_x IS NOT NULL 
        AND cmd.world_position_y IS NOT NULL
      ORDER BY cmd.session_time
      LIMIT 1000
    `;
    
    const trackLayoutResult = await pool.query(trackLayoutQuery, [sessionUid]);
    console.log(`Got ${trackLayoutResult.rows.length} track layout points`);
    
    // Check if we have frame_identifier in lap_data
    const frameIdentifierCheck = await pool.query(`
      SELECT COUNT(*) as has_frames 
      FROM lap_data 
      WHERE session_uid = $1 
        AND frame_identifier IS NOT NULL 
      LIMIT 1
    `, [sessionUid]);
    
    const hasFrameIdentifier = frameIdentifierCheck.rows.length > 0 && 
                               parseInt(frameIdentifierCheck.rows[0].has_frames) > 0;
    
    console.log(`Race ID ${raceId} ${hasFrameIdentifier ? 'HAS' : 'DOES NOT HAVE'} frame_identifier data`);
    
    // Get lap data for all drivers
    const lapDataQuery = `
      SELECT ld.lap_number, ld.car_index, ld.lap_time_ms, ld.created_at
        ${hasFrameIdentifier ? ', ld.frame_identifier' : ''}
      FROM lap_data ld
      WHERE ld.session_uid = $1 
        AND ld.lap_number > 0
      ORDER BY ld.car_index, ld.lap_number, ld.created_at
    `;
    
    const lapDataResult = await pool.query(lapDataQuery, [sessionUid]);
    console.log(`Got ${lapDataResult.rows.length} lap data entries`);
    
    // Group lap data by car_index and lap_number
    const lapsByDriver = {};
    lapDataResult.rows.forEach(row => {
      if (!lapsByDriver[row.car_index]) {
        lapsByDriver[row.car_index] = {};
      }
      
      if (!lapsByDriver[row.car_index][row.lap_number]) {
        lapsByDriver[row.car_index][row.lap_number] = [];
      }
      
      lapsByDriver[row.car_index][row.lap_number].push(row);
    });
    
    // Get best lap for each driver (lowest lap_time_ms)
    const bestLapsByDriver = {};
    Object.keys(lapsByDriver).forEach(carIndex => {
      const laps = lapsByDriver[carIndex];
      let bestLap = null;
      let bestLapTime = Infinity;
      
      Object.keys(laps).forEach(lapNumber => {
        // Use the last entry for each lap which should have the complete lap time
        const lapEntries = laps[lapNumber];
        if (lapEntries.length > 0) {
          const lastEntry = lapEntries[lapEntries.length - 1];
          if (lastEntry.lap_time_ms && lastEntry.lap_time_ms < bestLapTime) {
            bestLapTime = lastEntry.lap_time_ms;
            bestLap = {
              lap_number: parseInt(lapNumber),
              lap_time_ms: lastEntry.lap_time_ms,
              created_at: lastEntry.created_at,
              frame_identifier: lastEntry.frame_identifier
            };
          }
        }
      });
      
      if (bestLap) {
        bestLapsByDriver[carIndex] = bestLap;
      }
    });
    
    console.log(`Found best laps for ${Object.keys(bestLapsByDriver).length} drivers`);
    
    // Get telemetry/motion data for the best laps
    const motionDataByDriver = {};
    
    // Get the car indices of drivers with best laps
    const carIndicesWithBestLaps = Object.keys(bestLapsByDriver);
    
    // Define motion data query based on available columns
    const motionDataColumns = [
      'cmd.car_index',
      'cmd.session_time',
      'cmd.world_position_x',
      'cmd.world_position_y',
      'cmd.g_force_lateral',
      'cmd.g_force_longitudinal',
      'cmd.created_at'
    ];
    
    if (hasSpeedColumn) {
      motionDataColumns.push('cmd.speed');
    }
    
    let motionDataPromises = [];
    
    for (const carIndex of carIndicesWithBestLaps) {
      const bestLap = bestLapsByDriver[carIndex];
      
      if (hasFrameIdentifier && bestLap.frame_identifier) {
        // Method 1: Use frame_identifier if available
        // Get all frame identifiers for this lap
        const lapFramesQuery = `
          SELECT frame_identifier 
          FROM lap_data 
          WHERE session_uid = $1 
            AND car_index = $2 
            AND lap_number = $3 
            AND frame_identifier IS NOT NULL
        `;
        
        const lapFramesResult = await pool.query(lapFramesQuery, [sessionUid, carIndex, bestLap.lap_number]);
        const frameIds = lapFramesResult.rows.map(row => row.frame_identifier).filter(id => id !== null);
        
        if (frameIds.length > 0) {
          console.log(`Using ${frameIds.length} frame identifiers for car ${carIndex}, lap ${bestLap.lap_number}`);
          
          // Get motion data for these frame identifiers
          const placeholders = frameIds.map((_, i) => `$${i + 3}`).join(',');
          const motionDataQuery = `
            SELECT ${motionDataColumns.join(', ')}
            FROM car_motion_data cmd
            WHERE cmd.session_uid = $1
              AND cmd.car_index = $2
              AND cmd.frame_identifier IN (${placeholders})
            ORDER BY cmd.session_time
          `;
          
          const motionDataPromise = pool.query(motionDataQuery, [sessionUid, carIndex, ...frameIds])
            .then(result => {
              console.log(`Got ${result.rows.length} motion data points for car ${carIndex} using frame identifiers`);
              motionDataByDriver[carIndex] = processMotionData(result.rows, bestLap.lap_number, trackLength);
            })
            .catch(error => {
              console.error(`Error getting motion data for car ${carIndex}:`, error);
              return null;
            });
          
          motionDataPromises.push(motionDataPromise);
          continue;
        }
      }
      
      // Method 2: Use timestamp-based boundary estimation
      console.log(`Using timestamp method for car ${carIndex}, lap ${bestLap.lap_number}`);
      
      // Determine lap boundaries
      let startBoundary, endBoundary;
      
      // Find the last entry of the previous lap (bestLap.lap_number-1) - that's our start boundary
      if (bestLap.lap_number > 1 && lapsByDriver[carIndex][bestLap.lap_number - 1]) {
        const prevLapEntries = lapsByDriver[carIndex][bestLap.lap_number - 1];
        if (prevLapEntries.length > 0) {
          // Last entry of previous lap marks start of current lap
          startBoundary = new Date(prevLapEntries[prevLapEntries.length-1].created_at);
        } else {
          // If no previous lap entries found, use first entry of current lap and subtract time
          const currentLapEntries = lapsByDriver[carIndex][bestLap.lap_number];
          if (currentLapEntries.length > 0) {
            const firstCurrentEntry = currentLapEntries[0];
            startBoundary = new Date(new Date(firstCurrentEntry.created_at).getTime() - 90000);
          } else {
            continue; // Skip this lap if we can't determine boundaries
          }
        }
      } else {
        // For lap 1, estimate start time before first lap 1 entry
        const firstLapEntries = lapsByDriver[carIndex][bestLap.lap_number];
        if (firstLapEntries.length > 0) {
          // Start 90 seconds before first lap timestamp
          startBoundary = new Date(new Date(firstLapEntries[0].created_at).getTime() - 90000);
        } else {
          continue; // Skip this lap if we can't determine boundaries
        }
      }
      
      // The end boundary is the created_at of the best lap entry
      endBoundary = new Date(bestLap.created_at);
      
      console.log(`Lap ${bestLap.lap_number} boundaries for car ${carIndex}: ${startBoundary.toISOString()} to ${endBoundary.toISOString()}`);
      
      // Get motion data within these boundaries
      const motionDataQuery = `
        SELECT ${motionDataColumns.join(', ')}
        FROM car_motion_data cmd
        WHERE cmd.session_uid = $1
          AND cmd.car_index = $2
          AND cmd.created_at >= $3
          AND cmd.created_at <= $4
          AND cmd.world_position_x IS NOT NULL
          AND cmd.world_position_y IS NOT NULL
        ORDER BY cmd.session_time
      `;
      
      const motionDataPromise = pool.query(motionDataQuery, [sessionUid, carIndex, startBoundary, endBoundary])
        .then(result => {
          console.log(`Got ${result.rows.length} motion data points for car ${carIndex} using timestamp method`);
          motionDataByDriver[carIndex] = processMotionData(result.rows, bestLap.lap_number, trackLength);
        })
        .catch(error => {
          console.error(`Error getting motion data for car ${carIndex}:`, error);
          return null;
        });
      
      motionDataPromises.push(motionDataPromise);
    }
    
    // Wait for all motion data queries to complete
    await Promise.all(motionDataPromises);
    console.log(`Completed fetching motion data for ${Object.keys(motionDataByDriver).length} drivers`);
    
    // Format track layout data
    const trackLayout = trackLayoutResult.rows.map(row => ({
      worldPosX: parseFloat(row.worldposx),
      worldPosY: parseFloat(row.worldposy),
      distance: parseFloat(row.track_distance),
      sessionTime: parseFloat(row.session_time)
    }));
    
    // Process sector data for track dominance analysis 
    // Generate exactly 25 evenly spaced sectors around the track based on track distance
    const numSectors = 25; // Fixed at exactly 25 sectors
    const sectorSize = trackLength / numSectors;
    
    // Create sectors
    const sectors = Array.from({ length: numSectors }, (_, i) => {
      const sectorStartDistance = i * sectorSize;
      const sectorEndDistance = (i + 1) * sectorSize;
      return {
        sector: i,
        sectorStartDistance,
        sectorEndDistance,
        cars: {}
      };
    });
    
    // Process motion data for each car into sectors
    Object.keys(motionDataByDriver).forEach(carIndex => {
      const carMotionData = motionDataByDriver[carIndex];
      
      if (!carMotionData || carMotionData.length === 0) return;
      
      // Process each sector
      sectors.forEach(sector => {
        // Find motion data points within this sector
        const pointsInSector = carMotionData.filter(
          point => point.distance >= sector.sectorStartDistance && point.distance < sector.sectorEndDistance
        );
        
        if (pointsInSector.length === 0) return;
        
        // Calculate average position, speed, etc. for this sector
        const avgX = pointsInSector.reduce((sum, p) => sum + p.worldPosX, 0) / pointsInSector.length;
        const avgY = pointsInSector.reduce((sum, p) => sum + p.worldPosY, 0) / pointsInSector.length;
        const avgSpeed = hasSpeedColumn ? 
          pointsInSector.reduce((sum, p) => sum + (p.speed || 0), 0) / pointsInSector.length : 0;
        
        // Calculate sector time based on session time differences
        const startTime = Math.min(...pointsInSector.map(p => p.sessionTime));
        const endTime = Math.max(...pointsInSector.map(p => p.sessionTime));
        const sectorTimeElapsed = endTime - startTime;
        
        // Calculate estimated sector time based on speed (distance/speed)
        const sectorDistance = sector.sectorEndDistance - sector.sectorStartDistance;
        const sectorTime = avgSpeed > 0 ? sectorDistance / avgSpeed : 0;
        
        // Store sector data for this car
        sector.cars[`Car ${carIndex}`] = {
          carIndex: parseInt(carIndex),
          driver: driverMap[carIndex]?.name || `Driver ${carIndex}`,
          team: driverMap[carIndex]?.team || 'Unknown Team',
          worldPosX: avgX,
          worldPosY: avgY,
          avgSpeed: avgSpeed,
          sectorTimeElapsed: sectorTimeElapsed,
          sectorTime: sectorTime > 0 ? sectorTime : sectorTimeElapsed,
          positionCount: pointsInSector.length,
          pointsInSector: pointsInSector.length
        };
      });
    });
    
    // Format sector data for response
    const sectorData = {};
    sectors.forEach(sector => {
      if (Object.keys(sector.cars).length > 0) {
        sectorData[sector.sector] = sector.cars;
      }
    });
    
    // Calculate delta times between cars in each sector
    const sectorDeltaData = {};
    Object.keys(sectorData).forEach(sector => {
      const sectorInfo = sectorData[sector];
      const carIndices = Object.keys(sectorInfo);
      
      if (carIndices.length >= 2) {
        sectorDeltaData[sector] = {};
        
        // Calculate deltas between each pair of cars
        for (let i = 0; i < carIndices.length; i++) {
          for (let j = i + 1; j < carIndices.length; j++) {
            const car1 = carIndices[i];
            const car2 = carIndices[j];
            
            const car1Data = sectorInfo[car1];
            const car2Data = sectorInfo[car2];
            
            // Calculate time delta - try different methods based on available data
            let timeDelta = 0;
            let deltaMethod = 'unknown';
            
            // Method 1: Using explicit sectorTime
            if (car1Data.sectorTime && car2Data.sectorTime && 
                car1Data.sectorTime > 0 && car2Data.sectorTime > 0) {
              timeDelta = car2Data.sectorTime - car1Data.sectorTime;
              deltaMethod = 'sector-time';
            }
            // Method 2: Using time elapsed in the sector
            else if (car1Data.sectorTimeElapsed && car2Data.sectorTimeElapsed && 
                    car1Data.sectorTimeElapsed > 0 && car2Data.sectorTimeElapsed > 0) {
              timeDelta = car2Data.sectorTimeElapsed - car1Data.sectorTimeElapsed;
              deltaMethod = 'elapsed-time';
            }
            // Method 3: Using speed difference if available - convert to time delta
            else if (car1Data.avgSpeed && car2Data.avgSpeed && 
                    car1Data.avgSpeed > 0 && car2Data.avgSpeed > 0) {
              // Time delta is inversely proportional to speed
              // For equal distances, time ratio is inverse of speed ratio
              const sectorDistance = sectorSize;
              timeDelta = sectorDistance * (1/car2Data.avgSpeed - 1/car1Data.avgSpeed);
              deltaMethod = 'speed-to-time';
            }
            // Fallback method
            else {
              // More position points might indicate slower progress
              const pointRatio = (car2Data.pointsInSector / Math.max(1, car1Data.pointsInSector));
              timeDelta = (pointRatio - 1) * 0.1; // Small synthetic delta
              deltaMethod = 'point-count';
            }
            
            // Magnify delta to make visualization more interesting
            const magnifiedDelta = timeDelta * 10;
            
            // Store the delta
            sectorDeltaData[sector][`${car1}_vs_${car2}`] = {
              car1,
              car2,
              driver1: car1Data.driver,
              driver2: car2Data.driver,
              timeDelta,
              magnifiedDelta,
              deltaMethod,
              faster: timeDelta > 0 ? car1 : car2,
              fasterDriver: timeDelta > 0 ? car1Data.driver : car2Data.driver,
              advantage: Math.abs(timeDelta),
              magnifiedAdvantage: Math.abs(magnifiedDelta),
              car1Speed: car1Data.avgSpeed,
              car2Speed: car2Data.avgSpeed
            };
          }
        }
      }
    });
    
    console.log('Successfully processed track dominance data');
    
    return NextResponse.json({
      success: true,
      trackLayout,
      driverTelemetryData: motionDataByDriver,
      sectorData,
      sectorDeltaData,
      driverInfo: driverMap,
      hasSpeedData: hasSpeedColumn,
      bestLaps: bestLapsByDriver,
      metadata: {
        sessionUid,
        raceId,
        trackLength,
        totalTrackPoints: trackLayout.length,
        driversWithData: Object.keys(motionDataByDriver).map(carIndex => driverMap[carIndex]?.name || `Driver ${carIndex}`),
        sectorsAnalyzed: Object.keys(sectorData).length,
        frameIdentifierUsed: hasFrameIdentifier
      }
    });
    
  } catch (error) {
    console.error('Track dominance API error:', error);
    console.error('Error stack:', error.stack);
    
    // Return detailed error information for debugging
    return NextResponse.json(
      { 
        error: 'Failed to fetch track dominance data', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        params: {
          season: new URL(request.url).searchParams.get('season'),
          raceSlug: new URL(request.url).searchParams.get('raceSlug'),
          sessionType: new URL(request.url).searchParams.get('sessionType')
        }
      },
      { status: 500 }
    );
  }
}

// Helper function to process motion data points
function processMotionData(motionPoints, lapNumber, trackLength) {
  if (!motionPoints || motionPoints.length === 0) return [];
  
  // Calculate distance along the track based on time
  const startTime = parseFloat(motionPoints[0].session_time);
  const endTime = parseFloat(motionPoints[motionPoints.length-1].session_time);
  const lapDuration = endTime - startTime;
  
  return motionPoints.map((point, index) => {
    const pointTime = parseFloat(point.session_time);
    const timeFromStart = pointTime - startTime;
    const percentThroughLap = timeFromStart / lapDuration;
    
    // Process each point into a consistent format
    const processedPoint = {
      worldPosX: parseFloat(point.world_position_x),
      worldPosY: parseFloat(point.world_position_y),
      sessionTime: pointTime,
      lap_number: lapNumber,
      distance: percentThroughLap * trackLength,
      percentage: percentThroughLap * 100,
      gForceLateral: parseFloat(point.g_force_lateral) || 0,
      gForceLongitudinal: parseFloat(point.g_force_longitudinal) || 0
    };
    
    // Add speed if available
    if (point.speed !== undefined && point.speed !== null) {
      processedPoint.speed = parseFloat(point.speed);
    }
    
    return processedPoint;
  });
}