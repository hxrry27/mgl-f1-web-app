// app/api/lap-data/route.js
import { NextResponse } from 'next/server';
import { cachedApiResponse } from '@/lib/cachedApi';
import { getCacheKey, CACHE_DURATIONS } from '@/lib/redis';

// Import your existing pool directly
const pool = require('../../../lib/db');

// Keep ALL your existing constants exactly the same
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

// Keep ALL your existing helper functions exactly the same
function getTeamColor(teamId, teamName) {
  if (teamIdToColor[teamId]) {
    return teamIdToColor[teamId];
  }
  
  if (teamName && teamColors[teamName]) {
    return teamColors[teamName];
  }
  
  return `#${Math.floor(Math.random()*16777215).toString(16)}`;
}

// Keep your fetchLapTimesData function exactly the same
async function fetchLapTimesData(raceId) {
  //DEBUG: console.log(`Fetching lap_times data for race ID: ${raceId}`);
  
  try {
    // ... keep ALL your existing logic exactly the same
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
    
    //DEBUG: console.log(`Found ${driversResult.rows.length} drivers in lap_times`);
    
    if (driversResult.rows.length === 0) {
      return null;
    }
    
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
    
    //DEBUG: console.log(`Found ${lapDataResult.rows.length} lap data entries in lap_times`);
    
    if (lapDataResult.rows.length === 0) {
      return null;
    }
    
    // ... keep ALL the rest of your existing processing logic
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
    
    const processedLapData = lapDataResult.rows.map(lap => {
      const driver = driverMap[lap.driver_id] || { 
        name: `Driver ${lap.driver_id}`, 
        team: 'Unknown', 
        team_id: 0,
        team_color: '#888888'
      };
      
      let tyreCompound = lap.tyre_compound || 'Unknown';
      
      return {
        lap_number: lap.lap_number - 1,
        car_index: null,
        driver: driver.name,
        team: driver.team,
        team_id: driver.team_id,
        team_color: driver.team_color,
        lap_time_int: lap.lap_time_int,
        lap_time: lap.lap_time_int / 1000,
        sector1_time: lap.sector1_time_ms ? lap.sector1_time_ms / 1000 : null,
        sector2_time: lap.sector2_time_ms ? lap.sector2_time_ms / 1000 : null,
        sector3_time: lap.sector3_time_ms ? lap.sector3_time_ms / 1000 : null,
        tyre_compound: tyreCompound,
        tyre_stint_actual: null,
        tyre_stint_visual: null,
        tyre_stint_end_lap: null,
        lap_valid: true,
        source_table: lap.source_table
      };
    });
    
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
    
    const drivers = driversResult.rows.map(d => {
      const teamColor = getTeamColor(d.team_id, d.team_name);
      return {
        name: d.driver_name,
        team: d.team_name || 'Unknown Team',
        team_id: d.team_id,
        car_index: null,
        team_color: teamColor
      };
    });
    
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
      max_lap_number: maxLapNumber + 1,
      is_zero_indexed: true
    };
    
  } catch (error) {
    //DEBUG: console.error('Error fetching lap_times data:', error);
    return null;
  }
}

// NEW: Move your main logic to a separate function
async function computeLapDataFromDatabase(season, raceSlug, sessionType, dataSource) {
  //DEBUG: console.log(`Computing lap data for season ${season}, race ${raceSlug}, session type ${sessionType}, data source ${dataSource}`);

  // 1. Get the race_id by joining races with tracks to find by track slug
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

  // 2. Get all session_uids for this race from the mapping table
  const sessionResult = await pool.query(
    'SELECT session_uid FROM session_race_mapping WHERE race_id = $1',
    [raceId]
  );

  // If no sessions found, try lap_times table as fallback
  if (sessionResult.rows.length === 0) {
    //DEBUG: console.log('No telemetry session found. Trying lap_times table as fallback...');
    
    const lapTimesData = await fetchLapTimesData(raceId);
    
    if (lapTimesData) {
      return {
        session_uid: null,
        race_id: raceId,
        drivers: lapTimesData.drivers,
        teams: lapTimesData.teams,
        stintData: {},
        lapData: lapTimesData.lapData,
        source_table: 'lap_times',
        session_type: sessionType,
        available_sessions: [{ type: 'race', label: 'Race', uid: null }],
        max_lap_number: lapTimesData.max_lap_number,
        is_zero_indexed: lapTimesData.is_zero_indexed,
        data_source: 'lap_times'
      };
    }
    
    throw new Error('No telemetry session or lap times found for this race');
  }

  // ... keep ALL your existing session selection logic
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

  //DEBUG: console.log(`Selected session UID: ${sessionUid} for ${sessionType}`);

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

  //DEBUG: console.log(`Found ${driversResult.rows.length} drivers`);

  // ... keep ALL your existing data source selection logic
  let lapDataResult;
  let sourceTable;
  
  if (dataSource === 'bulk' || dataSource === 'auto') {
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
        AND lhbd.lap_time_ms > 0
      ORDER BY 
        lhbd.lap_number, lhbd.car_index
    `, [sessionUid]);

    //DEBUG: console.log(`Found ${bulkHistoryResult.rows.length} lap data entries in lap_history_bulk_data`);
    
    if (bulkHistoryResult.rows.length > 0) {
      lapDataResult = bulkHistoryResult;
      sourceTable = 'lap_history_bulk_data';
      //DEBUG: console.log("Using bulk history data (finalized data)");
    }
  }
  
  // ... keep ALL your other fallback logic for session_history, lap_data tables

  if (!lapDataResult && (dataSource === 'regular' || dataSource === 'auto')) {
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
        AND sh.lap_time_ms > 0
      ORDER BY 
        sh.lap_number, sh.car_index
    `, [sessionUid]);
    
    //DEBUG: console.log(`Found ${sessionHistoryResult.rows.length} lap data entries in regular session_history`);
    
    if (sessionHistoryResult.rows.length > 0) {
      lapDataResult = sessionHistoryResult;
      sourceTable = 'session_history';
      //DEBUG: console.log("Using regular session history data");
    }
  }
  
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
        AND ld.lap_time_ms > 0
        AND (ld.current_lap_invalid = 0 OR ld.is_valid = true)
      ORDER BY 
        ld.lap_number, ld.car_index
    `, [sessionUid]);
    
    //DEBUG: console.log(`Found ${lapDataTableResult.rows.length} lap data entries in lap_data`);
    
    if (lapDataTableResult.rows.length > 0) {
      lapDataResult = lapDataTableResult;
      sourceTable = 'lap_data';
      //DEBUG: console.log("Using lap_data table as fallback");
    } else {
      lapDataResult = { rows: [] };
      sourceTable = 'none';
      //DEBUG: console.log("No lap data found in any table");
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

  //DEBUG: console.log(`Found ${stintDataResult.rows.length} stint data entries`);

  // ... keep ALL your existing data processing logic
  const driverMap = {};
  driversResult.rows.forEach(driver => {
    const teamColor = getTeamColor(driver.team_id, driver.team_name);
    
    driverMap[driver.car_index] = {
      name: driver.driver_name,
      team_id: driver.team_id,
      team: driver.team_name || 'Unknown Team',
      team_color: teamColor
    };
  });

  const processedLapData = lapDataResult.rows.map(lap => {
    const driver = driverMap[lap.car_index] || { 
      name: `Driver ${lap.car_index}`, 
      team: 'Unknown', 
      team_id: 0,
      team_color: '#888888'
    };
    
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
  
    return {
      lap_number: lap.lap_number,
      car_index: lap.car_index,
      driver: driver.name,
      team: driver.team,
      team_id: driver.team_id,
      team_color: driver.team_color,
      lap_time_int: lap.lap_time_ms,
      lap_time: lap.lap_time_ms / 1000,
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

  const stintData = {};
  stintDataResult.rows.forEach(result => {
    stintData[result.driver_name] = result.stints_raw;
  });

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

  const availableSessions = [
    { type: 'qualifying', label: 'Qualifying', uid: sessionUids[0] },
    { type: 'race', label: 'Race', uid: sessionUids.length > 1 ? sessionUids[1] : null }
  ].filter(s => s.uid !== null);

  //DEBUG: console.log(`Successfully processed all data from ${sourceTable}`);

  let maxLapNumber = 0;
  for (const lap of processedLapData) {
    if (lap.lap_number > maxLapNumber) {
      maxLapNumber = lap.lap_number;
    }
  }
  
  return {
    session_uid: sessionUid,
    race_id: raceId,
    drivers,
    teams,
    stintData,
    lapData: processedLapData,
    source_table: sourceTable,
    session_type: sessionType,
    available_sessions: availableSessions,
    max_lap_number: maxLapNumber + 1,
    is_zero_indexed: true,
    data_source: dataSource
  };
}

// NEW: Your main API route - now super simple!
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season');
    const raceSlug = searchParams.get('raceSlug');
    const sessionType = searchParams.get('sessionType') || 'race';
    const dataSource = searchParams.get('dataSource') || 'auto';

    if (!season || !raceSlug) {
      return NextResponse.json(
        { message: 'Season and raceSlug are required' }, 
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = getCacheKey.lapData(season, raceSlug, sessionType);

    // Use cached API response wrapper
    return cachedApiResponse(
      cacheKey,
      async () => {
        // Call your existing computation function
        return await computeLapDataFromDatabase(season, raceSlug, sessionType, dataSource);
      },
      CACHE_DURATIONS.LAP_DATA // 6 hours cache
    );

  } catch (error) {
    //DEBUG: console.error('Error in lap data API:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message }, 
      { status: 500 }
    );
  }
}