import { NextResponse } from 'next/server';

// Import your existing pool directly
const pool = require('../../../lib/db');

// Team color mapping
const teamColors = {
  'Williams': '#64C4FF',
  'Renault': '#FFF500',
  'McLaren': '#FF8000',
  'Haas': '#B6BABD',
  'Alfa Romeo': '#900000',
  'Alpha Tauri': '#2B4562',
  'Aston Martin': '#229971',
  'Alpine': '#0093CC',
  'Mercedes': '#27F4D2',
  'Ferrari': '#E80020',
  'Red Bull': '#3671C6',
  'Racing Point': '#F596C8',
  'Toro Rosso': '#0000FF',
  'Racing Bulls': '#6692FF',
  'Kick Sauber': '#52E252'
};

// Team ID to color mapping
const teamIdToColor = {
  1: teamColors['Williams'],
  2: teamColors['Renault'],
  3: teamColors['McLaren'],
  4: teamColors['Haas'],
  5: teamColors['Alfa Romeo'],
  6: teamColors['Alpha Tauri'],
  7: teamColors['Aston Martin'],
  8: teamColors['Alpine'],
  9: teamColors['Mercedes'],
  10: teamColors['Ferrari'],
  11: teamColors['Red Bull'],
  12: teamColors['Racing Point'],
  13: teamColors['Toro Rosso'],
  14: teamColors['Racing Bulls'],
  15: teamColors['Kick Sauber']
};

// Function to get a color for a team
function getTeamColor(teamId, teamName) {
  // Try by ID first
  if (teamIdToColor[teamId]) {
    return teamIdToColor[teamId];
  }
  
  // Then try by name
  if (teamName && teamColors[teamName]) {
    return teamColors[teamName];
  }
  
  // Generate a color as fallback
  return `#${Math.floor(Math.random()*16777215).toString(16)}`;
}

// NEW FUNCTION: Fetch data from lap_times table as fallback
async function fetchLapTimesData(raceId) {
  console.log(`Fetching lap_times data for race ID: ${raceId}`);
  
  try {
    // 1. Get the drivers participating in this race
    const driversResult = await pool.query(`
      SELECT DISTINCT
        lt.driver_id,
        d.name as driver_name,
        d.team_id,
        t.name as team_name
      FROM 
        lap_times lt
      JOIN 
        drivers d ON lt.driver_id = d.id
      LEFT JOIN 
        teams t ON d.team_id = t.id
      WHERE 
        lt.race_id = $1
    `, [raceId]);
    
    console.log(`Found ${driversResult.rows.length} drivers in lap_times`);
    
    // If no drivers found, return null to indicate no data
    if (driversResult.rows.length === 0) {
      return null;
    }
    
    // 2. Get the lap data
    const lapDataResult = await pool.query(`
      SELECT 
        lt.lap_number,
        lt.driver_id,
        d.name as driver_name,
        d.team_id,
        t.name as team_name,
        lt.lap_time_int,
        lt.s1_time_int as sector1_time_ms,
        lt.s2_time_int as sector2_time_ms,
        lt.s3_time_int as sector3_time_ms,
        lt.tyre_compound,
        'lap_times' as source_table
      FROM 
        lap_times lt
      JOIN 
        drivers d ON lt.driver_id = d.id
      LEFT JOIN 
        teams t ON d.team_id = t.id
      WHERE 
        lt.race_id = $1
        AND lt.lap_time_int > 0
      ORDER BY 
        lt.lap_number, lt.driver_id
    `, [raceId]);
    
    console.log(`Found ${lapDataResult.rows.length} lap data entries in lap_times`);
    
    // If no lap data found, return null to indicate no data
    if (lapDataResult.rows.length === 0) {
      return null;
    }
    
    // Map driver ID to driver info
    const driverMap = {};
    driversResult.rows.forEach(driver => {
      const teamColor = getTeamColor(driver.team_id, driver.team_name);
      
      driverMap[driver.driver_id] = {
        name: driver.driver_name,
        team_id: driver.team_id,
        team: driver.team_name || 'Unknown Team',
        team_color: teamColor
      };
    });
    
    // Process lap data
    const processedLapData = lapDataResult.rows.map(lap => {
      const driver = driverMap[lap.driver_id] || { 
        name: `Driver ${lap.driver_id}`, 
        team: 'Unknown', 
        team_id: 0,
        team_color: '#888888'
      };
      
      // Map tyre compound names if needed
      let tyreCompound = lap.tyre_compound || 'Unknown';
      
      // Add the data to track max lap number for the race
      return {
        lap_number: lap.lap_number - 1, // Adjust to zero-indexed to match other data sources
        car_index: null, // Not available in lap_times
        driver: driver.name,
        team: driver.team,
        team_id: driver.team_id,
        team_color: driver.team_color,
        lap_time_int: lap.lap_time_int, // Integer value in milliseconds
        lap_time: lap.lap_time_int / 1000, // Convert to seconds for chart
        sector1_time: lap.sector1_time_ms ? lap.sector1_time_ms / 1000 : null,
        sector2_time: lap.sector2_time_ms ? lap.sector2_time_ms / 1000 : null,
        sector3_time: lap.sector3_time_ms ? lap.sector3_time_ms / 1000 : null,
        tyre_compound: tyreCompound,
        tyre_stint_actual: null, // Not available in lap_times
        tyre_stint_visual: null, // Not available in lap_times
        tyre_stint_end_lap: null, // Not available in lap_times
        lap_valid: true, // Assume valid for lap_times
        source_table: lap.source_table
      };
    });
    
    // Get team list - with mapped colors
    const teams = Array.from(new Set(driversResult.rows.map(d => d.team_name)))
      .filter(Boolean)
      .map(teamName => {
        const teamRow = driversResult.rows.find(d => d.team_name === teamName);
        return {
          id: teamRow?.team_id,
          name: teamName,
          color: getTeamColor(teamRow?.team_id, teamName)
        };
      });
    
    // Get driver list
    const drivers = driversResult.rows.map(d => {
      const teamColor = getTeamColor(d.team_id, d.team_name);
      return {
        name: d.driver_name,
        team: d.team_name || 'Unknown Team',
        team_id: d.team_id,
        car_index: null, // Not available in lap_times
        team_color: teamColor
      };
    });
    
    // Calculate the maximum lap number
    let maxLapNumber = 0;
    for (const lap of processedLapData) {
      if (lap.lap_number > maxLapNumber) {
        maxLapNumber = lap.lap_number;
      }
    }
    
    return {
      drivers,
      teams,
      lapData: processedLapData,
      source_table: 'lap_times',
      max_lap_number: maxLapNumber + 1, // Add 1 to account for zero-indexing
      is_zero_indexed: true
    };
    
  } catch (error) {
    console.error('Error fetching lap_times data:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    // Get search params from the URL
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season');
    const raceSlug = searchParams.get('raceSlug');
    const sessionType = searchParams.get('sessionType') || 'race'; // Default to race if not specified
    const dataSource = searchParams.get('dataSource') || 'auto'; // New parameter to control which data source to use

    if (!season || !raceSlug) {
      return NextResponse.json(
        { message: 'Season and raceSlug are required' }, 
        { status: 400 }
      );
    }

    console.log(`Fetching data for season ${season}, race ${raceSlug}, session type ${sessionType}, data source ${dataSource}`);

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

    // If no sessions found, try lap_times table as fallback
    if (sessionResult.rows.length === 0) {
      console.log('No telemetry session found. Trying lap_times table as fallback...');
      
      // Try to get data from lap_times table
      const lapTimesData = await fetchLapTimesData(raceId);
      
      if (lapTimesData) {
        return NextResponse.json({
          session_uid: null,
          race_id: raceId,
          drivers: lapTimesData.drivers,
          teams: lapTimesData.teams,
          stintData: {}, // No stint data available from lap_times
          lapData: lapTimesData.lapData,
          source_table: 'lap_times',
          session_type: sessionType,
          available_sessions: [{ type: 'race', label: 'Race', uid: null }], // No real session UID, but need placeholder
          max_lap_number: lapTimesData.max_lap_number,
          is_zero_indexed: lapTimesData.is_zero_indexed,
          data_source: 'lap_times'
        });
      }
      
      // If no lap_times data either, return 404
      return NextResponse.json(
        { message: 'No telemetry session or lap times found for this race' }, 
        { status: 404 }
      );
    }

    // Get the list of all available sessions
    const sessionUids = sessionResult.rows.map(row => row.session_uid);
    console.log(`Found ${sessionUids.length} sessions for this race: ${sessionUids.join(', ')}`);

    // If we have multiple sessions, try to determine which one is the race session
    // For now we'll use the second session if there are two or more, assuming race is after quali
    // This is a heuristic - a more accurate approach would be to check session_type if available
    let sessionUid;
    if (sessionType === 'qualifying' && sessionUids.length > 0) {
      // Use the first session for qualifying
      sessionUid = sessionUids[0];
    } else if (sessionType === 'race' && sessionUids.length > 1) {
      // Use the second session for race (assuming it's ordered chronologically)
      sessionUid = sessionUids[1];
    } else {
      // Default to the last session if we're unsure or have only one
      sessionUid = sessionUids[sessionUids.length - 1];
    }

    console.log(`Selected session UID: ${sessionUid} for ${sessionType}`);

    // 3. Get the driver info and team data for this session
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

    // Initialize variables for lap data
    let lapDataResult;
    let sourceTable;
    
    // Determine which data source to use based on the dataSource parameter
    if (dataSource === 'bulk' || dataSource === 'auto') {
      // 4a. First try to get the lap data from lap_history_bulk_data table (finalized data)
      const bulkHistoryResult = await pool.query(`
        SELECT 
          lhbd.lap_number,
          lhbd.car_index, 
          lhbd.lap_time_ms,
          lhbd.lap_valid,
          lhbd.sector1_time_ms,
          lhbd.sector2_time_ms,
          lhbd.sector3_time_ms,
          lhbd.tyre_stint_actual,
          lhbd.tyre_stint_visual,
          lhbd.tyre_stint_end_lap,
          'lap_history_bulk_data' as source_table
        FROM 
          lap_history_bulk_data lhbd
        WHERE 
          lhbd.session_uid = $1
          AND lhbd.lap_time_ms > 0  -- Skip laps with no time
        ORDER BY 
          lhbd.lap_number, lhbd.car_index
      `, [sessionUid]);

      console.log(`Found ${bulkHistoryResult.rows.length} lap data entries in lap_history_bulk_data`);
      
      if (bulkHistoryResult.rows.length > 0) {
        lapDataResult = bulkHistoryResult;
        sourceTable = 'lap_history_bulk_data';
        console.log("Using bulk history data (finalized data)");
      }
    }
    
    // If we don't have bulk data yet or specifically requested regular data
    if (!lapDataResult && (dataSource === 'regular' || dataSource === 'auto')) {
      // 4b. Try the regular session_history table
      const sessionHistoryResult = await pool.query(`
        SELECT 
          sh.lap_number,
          sh.car_index, 
          sh.lap_time_ms,
          sh.lap_valid,
          sh.sector1_time_ms,
          sh.sector2_time_ms,
          sh.sector3_time_ms,
          sh.tyre_stint_actual,
          sh.tyre_stint_visual,
          sh.tyre_stint_end_lap,
          'session_history' as source_table
        FROM 
          session_history sh
        WHERE 
          sh.session_uid = $1
          AND sh.lap_time_ms > 0  -- Skip laps with no time
        ORDER BY 
          sh.lap_number, sh.car_index
      `, [sessionUid]);
      
      console.log(`Found ${sessionHistoryResult.rows.length} lap data entries in regular session_history`);
      
      if (sessionHistoryResult.rows.length > 0) {
        lapDataResult = sessionHistoryResult;
        sourceTable = 'session_history';
        console.log("Using regular session history data");
      }
    }
    
    // 4c. If still no data, try lap_data table as a last resort
    if (!lapDataResult) {
      const lapDataTableResult = await pool.query(`
        SELECT 
          ld.lap_number,
          ld.car_index, 
          ld.lap_time_ms,
          CASE WHEN ld.current_lap_invalid = 0 THEN 1 ELSE 0 END as lap_valid,
          ld.sector1_time_ms,
          ld.sector2_time_ms,
          CASE 
            WHEN ld.lap_time_ms > 0 AND (ld.sector1_time_ms + ld.sector2_time_ms) <= ld.lap_time_ms 
            THEN ld.lap_time_ms - (ld.sector1_time_ms + ld.sector2_time_ms) 
            ELSE NULL 
          END as sector3_time_ms,
          NULL as tyre_stint_actual,
          NULL as tyre_stint_visual,
          NULL as tyre_stint_end_lap,
          'lap_data' as source_table
        FROM 
          lap_data ld
        WHERE 
          ld.session_uid = $1
          AND ld.lap_time_ms > 0  -- Skip laps with no time
          AND (ld.current_lap_invalid = 0 OR ld.is_valid = true)  -- Only valid laps
        ORDER BY 
          ld.lap_number, ld.car_index
      `, [sessionUid]);
      
      console.log(`Found ${lapDataTableResult.rows.length} lap data entries in lap_data`);
      
      if (lapDataTableResult.rows.length > 0) {
        lapDataResult = lapDataTableResult;
        sourceTable = 'lap_data';
        console.log("Using lap_data table as fallback");
      } else {
        // If we still don't have data, return an empty array
        lapDataResult = { rows: [] };
        sourceTable = 'none';
        console.log("No lap data found in any table");
      }
    }

    // 5. Get the stint data if available
    const stintDataResult = await pool.query(`
      SELECT 
        r.driver_id,
        d.name as driver_name,
        r.stints_raw
      FROM 
        race_results r
      JOIN 
        drivers d ON r.driver_id = d.id
      WHERE 
        r.race_id = $1
        AND r.stints_raw IS NOT NULL
        AND r.stints_raw != ''
    `, [raceId]);

    console.log(`Found ${stintDataResult.rows.length} stint data entries`);

    // Map car_index to driver info
    const driverMap = {};
    driversResult.rows.forEach(driver => {
      // Assign team color using our function
      const teamColor = getTeamColor(driver.team_id, driver.team_name);
      
      driverMap[driver.car_index] = {
        name: driver.driver_name,
        team_id: driver.team_id,
        team: driver.team_name || 'Unknown Team',
        team_color: teamColor
      };
    });

    // Process lap data
    const processedLapData = lapDataResult.rows.map(lap => {
      const driver = driverMap[lap.car_index] || { 
        name: `Driver ${lap.car_index}`, 
        team: 'Unknown', 
        team_id: 0,
        team_color: '#888888'
      };
      
      // Map tyre compound codes to names - only if we have tyre data
      let tyreCompound = 'Unknown';
      if (lap.tyre_stint_visual !== null) {
        switch (lap.tyre_stint_visual) {
          case 16: tyreCompound = 'Soft'; break;
          case 17: tyreCompound = 'Medium'; break;
          case 18: tyreCompound = 'Hard'; break;
          case 7: tyreCompound = 'Intermediate'; break;
          case 8: tyreCompound = 'Wet'; break;
          default: tyreCompound = 'Unknown';
        }
      }
    
      // Add the data to track max lap number for the race
      return {
        lap_number: lap.lap_number,
        car_index: lap.car_index,
        driver: driver.name,
        team: driver.team,
        team_id: driver.team_id,
        team_color: driver.team_color,
        lap_time_int: lap.lap_time_ms, // Integer value in milliseconds
        lap_time: lap.lap_time_ms / 1000, // Convert to seconds for chart
        sector1_time: lap.sector1_time_ms ? lap.sector1_time_ms / 1000 : null,
        sector2_time: lap.sector2_time_ms ? lap.sector2_time_ms / 1000 : null,
        sector3_time: lap.sector3_time_ms ? lap.sector3_time_ms / 1000 : null,
        tyre_compound: tyreCompound,
        tyre_stint_actual: lap.tyre_stint_actual,
        tyre_stint_visual: lap.tyre_stint_visual,
        tyre_stint_end_lap: lap.tyre_stint_end_lap,
        lap_valid: lap.lap_valid === 1,
        source_table: lap.source_table
      };
    });

    // Process stint data
    const stintData = {};
    stintDataResult.rows.forEach(result => {
      stintData[result.driver_name] = result.stints_raw;
    });

    // Get team list - with mapped colors
    const teams = Array.from(new Set(driversResult.rows.map(d => d.team_name)))
      .filter(Boolean)
      .map(teamName => {
        const teamRow = driversResult.rows.find(d => d.team_name === teamName);
        return {
          id: teamRow?.team_id,
          name: teamName,
          color: getTeamColor(teamRow?.team_id, teamName)
        };
      });

    // Get driver list
    const drivers = driversResult.rows.map(d => {
      const teamColor = getTeamColor(d.team_id, d.team_name);
      return {
        name: d.driver_name,
        team: d.team_name || 'Unknown Team',
        team_id: d.team_id,
        car_index: d.car_index,
        team_color: teamColor
      };
    });

    // Get available sessions for this race
    const availableSessions = [
      { type: 'qualifying', label: 'Qualifying', uid: sessionUids[0] },
      { type: 'race', label: 'Race', uid: sessionUids.length > 1 ? sessionUids[1] : null }
    ].filter(s => s.uid !== null);

    console.log(`Successfully processed all data from ${sourceTable}`);

    // Calculate the maximum lap number more efficiently (avoiding spread operator for large arrays)
    let maxLapNumber = 0;
    for (const lap of processedLapData) {
      if (lap.lap_number > maxLapNumber) {
        maxLapNumber = lap.lap_number;
      }
    }
    
    // Include the max lap number + 1 in the response (to account for zero-indexed laps)
    // Along with a flag indicating if this is zero-indexed data
    return NextResponse.json({
      session_uid: sessionUid,
      race_id: raceId,
      drivers,
      teams,
      stintData,
      lapData: processedLapData,
      source_table: sourceTable,
      session_type: sessionType,
      available_sessions: availableSessions,
      max_lap_number: maxLapNumber + 1, // Add 1 to account for zero-indexing
      is_zero_indexed: true, // Flag to indicate this data uses zero-indexed laps
      data_source: dataSource // Include the data source that was used
    });
  } catch (error) {
    console.error('Error fetching lap data:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message }, 
      { status: 500 }
    );
  }
}