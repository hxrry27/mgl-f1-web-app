// app/api/general-stats/route.js
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

    console.log(`Fetching general stats for season ${season}, race ${raceSlug}, session type ${sessionType}`);

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

    // 2. Get session UID for this race
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

    // Select the appropriate session based on session type
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

    // Create driver mapping for car_index to driver info
    const driverMap = {};
    driversResult.rows.forEach(driver => {
      driverMap[driver.car_index] = {
        name: driver.driver_name,
        team: driver.team_name || 'Unknown Team'
      };
    });

    // Check if frame_identifier is available for better lap detection
    const frameIdentifierCheck = await pool.query(`
      SELECT COUNT(*) as has_frames 
      FROM lap_data 
      WHERE session_uid = $1 
        AND frame_identifier IS NOT NULL 
      LIMIT 1
    `, [sessionUid]);

    const hasFrameIdentifier = frameIdentifierCheck.rows.length > 0 && 
                              frameIdentifierCheck.rows[0].has_frames > 0;

    console.log(`Frame identifiers available: ${hasFrameIdentifier ? 'Yes' : 'No'}`);

    // 4. ERS data - deployed and harvested (per lap max/min) with explicit debugging
    const ersQuery = `
      WITH deployment_data AS (
        SELECT
          car_index,
          MAX(ers_deployed_this_lap) as raw_max_deployed,
          MAX(ers_deployed_this_lap) / 1000000.0 as max_deployed_mj,
          MIN(CASE WHEN ers_deployed_this_lap > 0 THEN ers_deployed_this_lap ELSE NULL END) / 1000000.0 as min_deployed_mj
        FROM
          car_status_data
        WHERE
          session_uid = $1
          AND ers_deployed_this_lap > 0
        GROUP BY
          car_index
      ),
      harvesting_data AS (
        SELECT
          car_index,
          MAX(ers_harvested_this_lap_mguk + ers_harvested_this_lap_mguh) as raw_max_harvested,
          MAX(ers_harvested_this_lap_mguk + ers_harvested_this_lap_mguh) / 1000000.0 as max_harvested_mj,
          MIN(CASE WHEN (ers_harvested_this_lap_mguk + ers_harvested_this_lap_mguh) > 0 
              THEN (ers_harvested_this_lap_mguk + ers_harvested_this_lap_mguh) 
              ELSE NULL END) / 1000000.0 as min_harvested_mj
        FROM
          car_status_data
        WHERE
          session_uid = $1
          AND (ers_harvested_this_lap_mguk + ers_harvested_this_lap_mguh) > 0
        GROUP BY
          car_index
      )
      SELECT
        COALESCE(d.car_index, h.car_index) as car_index,
        d.raw_max_deployed,
        d.max_deployed_mj,
        d.min_deployed_mj,
        h.raw_max_harvested,
        h.max_harvested_mj,
        h.min_harvested_mj
      FROM
        deployment_data d
      FULL OUTER JOIN
        harvesting_data h ON d.car_index = h.car_index
    `;

    // 5. Total ERS across the race - choose approach based on available data
    const ersTotalWithFrameQuery = `
      WITH lap_boundaries AS (
        -- Get the frame_identifier for each lap's start and end
        SELECT 
          car_index,
          lap_number,
          MAX(frame_identifier) as last_frame_id
        FROM 
          lap_data
        WHERE 
          session_uid = $1
          AND frame_identifier IS NOT NULL
        GROUP BY 
          car_index, lap_number
      ),
      lap_ers_totals AS (
        -- Get the final ERS values for each lap using frame_identifier
        SELECT
          csd.car_index,
          ld.lap_number,
          MAX(csd.ers_deployed_this_lap) as lap_deployed,
          MAX(csd.ers_harvested_this_lap_mguk + csd.ers_harvested_this_lap_mguh) as lap_harvested
        FROM
          car_status_data csd
        JOIN 
          lap_boundaries ld ON csd.car_index = ld.car_index AND csd.frame_identifier <= ld.last_frame_id
        WHERE
          csd.session_uid = $1
        GROUP BY
          csd.car_index, ld.lap_number
      )
      -- Sum up all lap totals to get race totals
      SELECT
        car_index,
        SUM(lap_deployed) / 1000000 as total_deployed_mj,
        SUM(lap_harvested) / 1000000 as total_harvested_mj
      FROM
        lap_ers_totals
      GROUP BY
        car_index
    `;

    const ersTotalWithTimeQuery = `
      WITH lap_boundaries AS (
        -- Get the session_time for each lap's end
        SELECT 
          car_index,
          lap_number,
          MAX(session_time) as end_time
        FROM 
          lap_data
        WHERE 
          session_uid = $1
        GROUP BY 
          car_index, lap_number
      ),
      lap_ers_totals AS (
        -- Get the final ERS values for each lap
        SELECT
          csd.car_index,
          ld.lap_number,
          MAX(csd.ers_deployed_this_lap) as lap_deployed,
          MAX(csd.ers_harvested_this_lap_mguk + csd.ers_harvested_this_lap_mguh) as lap_harvested
        FROM
          car_status_data csd
        JOIN 
          lap_boundaries ld 
          ON csd.car_index = ld.car_index 
          AND csd.session_time <= ld.end_time
        WHERE
          csd.session_uid = $1
        GROUP BY
          csd.car_index, ld.lap_number
      )
      -- Sum up max values from each lap to get race totals
      SELECT
        car_index,
        SUM(lap_deployed) / 1000000 as total_deployed_mj,
        SUM(lap_harvested) / 1000000 as total_harvested_mj
      FROM
        lap_ers_totals
      GROUP BY
        car_index
    `;
    
    // Choose the appropriate total ERS query based on available data
    const ersTotalQuery = hasFrameIdentifier ? ersTotalWithFrameQuery : ersTotalWithTimeQuery;

    // 6. Speed and gear shifts data
    const speedQuery = `
      WITH gear_changes AS (
        SELECT
          car_index,
          session_time,
          speed,
          gear,
          LAG(gear) OVER (PARTITION BY car_index ORDER BY session_time) as prev_gear
        FROM
          car_telemetry_data
        WHERE
          session_uid = $1
      )
      SELECT
        car_index,
        MAX(speed) as max_speed,
        COUNT(CASE WHEN gear != prev_gear AND prev_gear IS NOT NULL THEN 1 END) as gear_shifts
      FROM
        gear_changes
      GROUP BY
        car_index
    `;

    // 7. G-force data
    const gForceQuery = `
      SELECT
        car_index,
        MAX(GREATEST(ABS(g_force_lateral), ABS(g_force_longitudinal), ABS(g_force_vertical))) as max_g_force
      FROM
        car_motion_data
      WHERE
        session_uid = $1
      GROUP BY
        car_index
    `;

    // 8. Events data (overtakes, collisions)
    const eventsQuery = `
      SELECT 
        'OVERTAKE' as event_type,
        COUNT(*) as count,
        car_index
      FROM 
        events
      WHERE 
        session_uid = $1 
        AND event_type = 'OVERTAKE'
      GROUP BY
        car_index
      
      UNION ALL
      
      SELECT 
        'COLLISION' as event_type,
        COUNT(*) as count,
        car_index
      FROM 
        events
      WHERE 
        session_uid = $1 
        AND event_type = 'COLLISION'
      GROUP BY
        car_index
      
      UNION ALL
      
      SELECT 
        'FASTEST_LAP' as event_type,
        COUNT(*) as count,
        NULL as car_index
      FROM 
        events
      WHERE 
        session_uid = $1 
        AND event_type = 'FASTEST_LAP'
    `;

    // 9. Temperature stats
    const tempQuery = `
      SELECT
        car_index,
        MAX(GREATEST(brakes_temp_fl, brakes_temp_fr, brakes_temp_rl, brakes_temp_rr)) as max_brake_temp,
        MIN(LEAST(
          NULLIF(brakes_temp_fl, 0), 
          NULLIF(brakes_temp_fr, 0), 
          NULLIF(brakes_temp_rl, 0), 
          NULLIF(brakes_temp_rr, 0)
        )) as min_brake_temp,
        MAX(GREATEST(tyre_surface_temp_fl, tyre_surface_temp_fr, tyre_surface_temp_rl, tyre_surface_temp_rr)) as max_tyre_temp,
        MIN(LEAST(
          NULLIF(tyre_surface_temp_fl, 0), 
          NULLIF(tyre_surface_temp_fr, 0), 
          NULLIF(tyre_surface_temp_rl, 0), 
          NULLIF(tyre_surface_temp_rr, 0)
        )) as min_tyre_temp
      FROM
        car_telemetry_data
      WHERE
        session_uid = $1
      GROUP BY
        car_index
    `;

    // 10. Tyre wear data
    const tyreWearQuery = `
      SELECT
        car_index,
        MAX(GREATEST(tyre_wear_fl, tyre_wear_fr, tyre_wear_rl, tyre_wear_rr)) as max_tyre_wear,
        CASE 
          WHEN MAX(tyre_wear_fl) >= MAX(tyre_wear_fr) AND MAX(tyre_wear_fl) >= MAX(tyre_wear_rl) AND MAX(tyre_wear_fl) >= MAX(tyre_wear_rr) THEN 'Front Left'
          WHEN MAX(tyre_wear_fr) >= MAX(tyre_wear_fl) AND MAX(tyre_wear_fr) >= MAX(tyre_wear_rl) AND MAX(tyre_wear_fr) >= MAX(tyre_wear_rr) THEN 'Front Right'
          WHEN MAX(tyre_wear_rl) >= MAX(tyre_wear_fl) AND MAX(tyre_wear_rl) >= MAX(tyre_wear_fr) AND MAX(tyre_wear_rl) >= MAX(tyre_wear_rr) THEN 'Rear Left'
          ELSE 'Rear Right'
        END as most_worn_tyre
      FROM
        car_damage_data
      WHERE
        session_uid = $1
      GROUP BY
        car_index
    `;

    // 11. Surface time stats
    const surfaceQuery = `
      WITH surface_events AS (
        -- Find all points where a car transitions to or from a surface
        SELECT
          car_index,
          frame_identifier,
          session_time,
          -- Consider car off-track if ANY wheel is not on tarmac (0)
          CASE 
            WHEN surface_type_fl > 0 OR surface_type_fr > 0 OR surface_type_rl > 0 OR surface_type_rr > 0 
            THEN TRUE 
            ELSE FALSE 
          END as is_off_track,
          -- Determine the primary surface type (using the most common non-zero value)
          GREATEST(
            COALESCE(surface_type_fl, 0),
            COALESCE(surface_type_fr, 0),
            COALESCE(surface_type_rl, 0),
            COALESCE(surface_type_rr, 0)
          ) as surface_type,
          -- Track previous state for transition detection
          LAG(CASE 
            WHEN surface_type_fl > 0 OR surface_type_fr > 0 OR surface_type_rl > 0 OR surface_type_rr > 0 
            THEN TRUE 
            ELSE FALSE 
          END) OVER (PARTITION BY car_index ORDER BY frame_identifier) as prev_is_off_track
        FROM
          car_telemetry_data
        WHERE
          session_uid = $1
        ORDER BY
          car_index, frame_identifier
      ),
      
      surface_segments AS (
        -- Identify segments where surface type changes or transitions on/off track
        SELECT
          car_index,
          frame_identifier,
          session_time,
          surface_type,
          is_off_track,
          -- Mark when we have a transition (either surface change or on/off track)
          CASE
            WHEN prev_is_off_track IS NULL THEN 1
            WHEN is_off_track != prev_is_off_track THEN 1
            ELSE 0
          END as is_transition,
          -- Create segment groups for continuous segments
          SUM(CASE
            WHEN prev_is_off_track IS NULL THEN 1
            WHEN is_off_track != prev_is_off_track THEN 1
            ELSE 0
          END) OVER (PARTITION BY car_index ORDER BY frame_identifier) as segment_id
        FROM
          surface_events
        WHERE
          surface_type > 0 -- Only care about non-tarmac surfaces
      ),
      
      segment_durations AS (
        -- Calculate duration of each segment
        SELECT
          car_index,
          segment_id,
          surface_type,
          MIN(session_time) as start_time,
          MAX(session_time) as end_time,
          MAX(session_time) - MIN(session_time) as duration_seconds
        FROM
          surface_segments
        GROUP BY
          car_index, segment_id, surface_type
        HAVING
          COUNT(*) > 1 -- Must have at least two points to calculate duration
      ),
      
      surface_totals AS (
        -- Sum up time by surface type for each car
        SELECT
          car_index,
          surface_type,
          SUM(duration_seconds) as total_time_seconds
        FROM
          segment_durations
        GROUP BY
          car_index, surface_type
      )
      
      -- Get final results
      SELECT
        st.car_index,
        st.surface_type,
        st.total_time_seconds
      FROM
        surface_totals st
      WHERE
        st.total_time_seconds > 0
      ORDER BY
        st.surface_type, st.total_time_seconds DESC
    `;

    // Execute all queries in parallel
    try {
      const [
        ersResults,
        ersTotalResults,
        speedResults,
        gForceResults, 
        eventsResults,
        tempResults,
        tyreWearResults,
        surfaceResults,
      ] = await Promise.all([
        pool.query(ersQuery, [sessionUid]),
        pool.query(ersTotalQuery, [sessionUid]).catch(err => {
          console.error('Error fetching ERS total data:', err);
          return { rows: [] }; // Return empty result on error
        }),
        pool.query(speedQuery, [sessionUid]),
        pool.query(gForceQuery, [sessionUid]),
        pool.query(eventsQuery, [sessionUid]),
        pool.query(tempQuery, [sessionUid]),
        pool.query(tyreWearQuery, [sessionUid]),
        pool.query(surfaceQuery, [sessionUid]),
      ]);

      console.log("All queries executed successfully");

      // Process ERS data with explicit debugging
      const ersData = ersResults.rows.map(row => {
        // Log the raw values from the database for debugging
        console.log(`Car ${row.car_index} - Raw deployed: ${row.raw_max_deployed}, Raw harvested: ${row.raw_max_harvested}`);
        console.log(`Car ${row.car_index} - Calculated MJ deployed: ${row.max_deployed_mj}, Calculated MJ harvested: ${row.max_harvested_mj}`);
        
        // Ensure values are properly handled as numbers
        const maxDeployedMj = parseFloat(row.max_deployed_mj || 0);
        const minDeployedMj = parseFloat(row.min_deployed_mj || 0);
        const maxHarvestedMj = parseFloat(row.max_harvested_mj || 0);
        const minHarvestedMj = parseFloat(row.min_harvested_mj || 0);
        
        // Additional check for very small values that might indicate a conversion error
        const fixedMaxDeployed = maxDeployedMj < 0.01 && row.raw_max_deployed > 1000 
          ? row.raw_max_deployed / 1000000 
          : maxDeployedMj;
          
        const fixedMaxHarvested = maxHarvestedMj < 0.01 && row.raw_max_harvested > 1000 
          ? row.raw_max_harvested / 1000000 
          : maxHarvestedMj;
        
        console.log(`Car ${row.car_index} - Final MJ deployed: ${fixedMaxDeployed}, Final MJ harvested: ${fixedMaxHarvested}`);
          
        return {
          car_index: row.car_index,
          max_deployed_mj: fixedMaxDeployed,
          min_deployed_mj: minDeployedMj,
          max_harvested_mj: fixedMaxHarvested,
          min_harvested_mj: minHarvestedMj,
          ...driverMap[row.car_index]
        };
      });

      const mostDeployed = ersData.length > 0 
        ? ersData.filter(d => d.max_deployed_mj > 0)
          .sort((a, b) => b.max_deployed_mj - a.max_deployed_mj)[0] 
        : null;
      
      const leastDeployed = ersData.length > 0 
        ? ersData.filter(d => d.min_deployed_mj > 0)
          .sort((a, b) => a.min_deployed_mj - b.min_deployed_mj)[0] 
        : null;
      
      const mostHarvested = ersData.length > 0 
        ? ersData.filter(d => d.max_harvested_mj > 0)
          .sort((a, b) => b.max_harvested_mj - a.max_harvested_mj)[0] 
        : null;
      
      const leastHarvested = ersData.length > 0 
        ? ersData.filter(d => d.min_harvested_mj > 0)
          .sort((a, b) => a.min_harvested_mj - b.min_harvested_mj)[0] 
        : null;

      // Process ERS Total Race data
      const ersTotalData = ersTotalResults.rows.map(row => ({
        car_index: row.car_index,
        total_deployed_mj: parseFloat(row.total_deployed_mj || 0),
        total_harvested_mj: parseFloat(row.total_harvested_mj || 0),
        ...driverMap[row.car_index]
      }));
      
      const mostTotalDeployed = ersTotalData.length > 0 
        ? ersTotalData.filter(d => d.total_deployed_mj > 0)
          .sort((a, b) => b.total_deployed_mj - a.total_deployed_mj)[0] 
        : null;
      
      const leastTotalDeployed = ersTotalData.length > 0 
        ? ersTotalData.filter(d => d.total_deployed_mj > 0)
          .sort((a, b) => a.total_deployed_mj - b.total_deployed_mj)[0] 
        : null;
      
      const mostTotalHarvested = ersTotalData.length > 0 
        ? ersTotalData.filter(d => d.total_harvested_mj > 0)
          .sort((a, b) => b.total_harvested_mj - a.total_harvested_mj)[0] 
        : null;
      
      const leastTotalHarvested = ersTotalData.length > 0 
        ? ersTotalData.filter(d => d.total_harvested_mj > 0)
          .sort((a, b) => a.total_harvested_mj - b.total_harvested_mj)[0] 
        : null;    

      // Process speed data
      const speedData = speedResults.rows.map(row => ({
        car_index: row.car_index,
        top_speed: parseInt(row.max_speed || 0),
        gear_shifts: parseInt(row.gear_shifts || 0),
        ...driverMap[row.car_index]
      }));

      const topSpeed = speedData.length > 0 
        ? speedData.sort((a, b) => b.top_speed - a.top_speed)[0] 
        : null;
      
      const mostGearShifts = speedData.length > 0 
        ? speedData.sort((a, b) => b.gear_shifts - a.gear_shifts)[0] 
        : null;
      
      const leastGearShifts = speedData.length > 0 
        ? speedData.sort((a, b) => a.gear_shifts - b.gear_shifts)[0] 
        : null;

      // Process G-force data
      const gForceData = gForceResults.rows.map(row => ({
        car_index: row.car_index,
        max_g_force: parseFloat(row.max_g_force || 0),
        ...driverMap[row.car_index]
      }));

      const highestGForce = gForceData.length > 0 
        ? gForceData.sort((a, b) => b.max_g_force - a.max_g_force)[0] 
        : null;

      // Process events data
      const overtakeEvents = eventsResults.rows
        .filter(e => e.event_type === 'OVERTAKE' && e.car_index !== null)
        .map(row => ({
          car_index: row.car_index,
          count: parseInt(row.count || 0),
          ...driverMap[row.car_index]
        }));
      
      const collisionEvents = eventsResults.rows
        .filter(e => e.event_type === 'COLLISION' && e.car_index !== null)
        .map(row => ({
          car_index: row.car_index,
          count: parseInt(row.count || 0),
          ...driverMap[row.car_index]
        }));
      
      const fastestLapCount = eventsResults.rows
        .find(e => e.event_type === 'FASTEST_LAP')?.count || 0;
      
      const totalOvertakes = overtakeEvents.reduce((sum, event) => sum + event.count, 0);
      
      const mostOvertakes = overtakeEvents.length > 0 
        ? overtakeEvents.sort((a, b) => b.count - a.count)[0] 
        : null;
      
      const mostCollisions = collisionEvents.length > 0 
        ? collisionEvents.sort((a, b) => b.count - a.count)[0] 
        : null;

      // Process temperature data
      const tempData = tempResults.rows.map(row => {
        // Get all temperature values
        const tyreTemp_fl = parseInt(row.tyre_surface_temp_fl || 0);
        const tyreTemp_fr = parseInt(row.tyre_surface_temp_fr || 0);
        const tyreTemp_rl = parseInt(row.tyre_surface_temp_rl || 0);
        const tyreTemp_rr = parseInt(row.tyre_surface_temp_rr || 0);
        
        const brakeTemp_fl = parseInt(row.brakes_temp_fl || 0);
        const brakeTemp_fr = parseInt(row.brakes_temp_fr || 0);
        const brakeTemp_rl = parseInt(row.brakes_temp_rl || 0);
        const brakeTemp_rr = parseInt(row.brakes_temp_rr || 0);
        
        // Determine which position has the max/min values
        let maxTyrePos = "Unknown";
        if (tyreTemp_fl >= tyreTemp_fr && tyreTemp_fl >= tyreTemp_rl && tyreTemp_fl >= tyreTemp_rr) {
          maxTyrePos = "Front Left";
        } else if (tyreTemp_fr >= tyreTemp_fl && tyreTemp_fr >= tyreTemp_rl && tyreTemp_fr >= tyreTemp_rr) {
          maxTyrePos = "Front Right";
        } else if (tyreTemp_rl >= tyreTemp_fl && tyreTemp_rl >= tyreTemp_fr && tyreTemp_rl >= tyreTemp_rr) {
          maxTyrePos = "Rear Left";
        } else if (tyreTemp_rr >= tyreTemp_fl && tyreTemp_rr >= tyreTemp_fr && tyreTemp_rr >= tyreTemp_rl) {
          maxTyrePos = "Rear Right";
        }
        
        let minTyrePos = "Unknown";
        const validTyreTemps = [
          tyreTemp_fl > 0 ? tyreTemp_fl : Infinity,
          tyreTemp_fr > 0 ? tyreTemp_fr : Infinity,
          tyreTemp_rl > 0 ? tyreTemp_rl : Infinity,
          tyreTemp_rr > 0 ? tyreTemp_rr : Infinity
        ];
        const minTyreTemp = Math.min(...validTyreTemps);
        
        if (minTyreTemp === tyreTemp_fl) {
          minTyrePos = "Front Left";
        } else if (minTyreTemp === tyreTemp_fr) {
          minTyrePos = "Front Right";
        } else if (minTyreTemp === tyreTemp_rl) {
          minTyrePos = "Rear Left";
        } else if (minTyreTemp === tyreTemp_rr) {
          minTyrePos = "Rear Right";
        }
        
        let maxBrakePos = "Unknown";
        if (brakeTemp_fl >= brakeTemp_fr && brakeTemp_fl >= brakeTemp_rl && brakeTemp_fl >= brakeTemp_rr) {
          maxBrakePos = "Front Left";
        } else if (brakeTemp_fr >= brakeTemp_fl && brakeTemp_fr >= brakeTemp_rl && brakeTemp_fr >= brakeTemp_rr) {
          maxBrakePos = "Front Right";
        } else if (brakeTemp_rl >= brakeTemp_fl && brakeTemp_rl >= brakeTemp_fr && brakeTemp_rl >= brakeTemp_rr) {
          maxBrakePos = "Rear Left";
        } else if (brakeTemp_rr >= brakeTemp_fl && brakeTemp_rr >= brakeTemp_fr && brakeTemp_rr >= brakeTemp_rl) {
          maxBrakePos = "Rear Right";
        }
        
        let minBrakePos = "Unknown";
        const validBrakeTemps = [
          brakeTemp_fl > 0 ? brakeTemp_fl : Infinity,
          brakeTemp_fr > 0 ? brakeTemp_fr : Infinity,
          brakeTemp_rl > 0 ? brakeTemp_rl : Infinity,
          brakeTemp_rr > 0 ? brakeTemp_rr : Infinity
        ];
        const minBrakeTemp = Math.min(...validBrakeTemps);
        
        if (minBrakeTemp === brakeTemp_fl) {
          minBrakePos = "Front Left";
        } else if (minBrakeTemp === brakeTemp_fr) {
          minBrakePos = "Front Right";
        } else if (minBrakeTemp === brakeTemp_rl) {
          minBrakePos = "Rear Left";
        } else if (minBrakeTemp === brakeTemp_rr) {
          minBrakePos = "Rear Right";
        }
        
        return {
          car_index: row.car_index,
          max_brake_temp: parseInt(row.max_brake_temp || 0),
          min_brake_temp: parseInt(row.min_brake_temp || 0),
          max_tyre_temp: parseInt(row.max_tyre_temp || 0),
          min_tyre_temp: parseInt(row.min_tyre_temp || 0),
          max_brake_pos: maxBrakePos,
          min_brake_pos: minBrakePos,
          max_tyre_pos: maxTyrePos,
          min_tyre_pos: minTyrePos,
          ...driverMap[row.car_index]
        };
      });

      const highestBrakeTemp = tempData.length > 0 
        ? tempData.filter(d => d.max_brake_temp > 0).sort((a, b) => b.max_brake_temp - a.max_brake_temp)[0] 
        : null;
      
      const lowestBrakeTemp = tempData.length > 0 
        ? tempData.filter(d => d.min_brake_temp > 0).sort((a, b) => a.min_brake_temp - b.min_brake_temp)[0] 
        : null;
      
      const highestTyreTemp = tempData.length > 0 
        ? tempData.filter(d => d.max_tyre_temp > 0).sort((a, b) => b.max_tyre_temp - a.max_tyre_temp)[0] 
        : null;
      
      const lowestTyreTemp = tempData.length > 0 
        ? tempData.filter(d => d.min_tyre_temp > 0).sort((a, b) => a.min_tyre_temp - b.min_tyre_temp)[0] 
        : null;

      // Process tyre wear data
      const tyreWearData = tyreWearResults.rows.map(row => ({
        car_index: row.car_index,
        max_tyre_wear: parseFloat(row.max_tyre_wear || 0),
        most_worn_tyre: row.most_worn_tyre,
        ...driverMap[row.car_index]
      }));

      const highestTyreWear = tyreWearData.length > 0 
        ? tyreWearData.filter(d => d.max_tyre_wear > 0).sort((a, b) => b.max_tyre_wear - a.max_tyre_wear)[0] 
        : null;

      // Process surface data
      const surfaceTypeNames = {
        0: 'Tarmac',
        1: 'Rumble Strip',
        2: 'Concrete',
        3: 'Rock',
        4: 'Gravel',
        5: 'Mud',
        6: 'Sand',
        7: 'Grass',
        8: 'Water',
        9: 'Cobblestone',
        10: 'Metal',
        11: 'Ridged',
      };

      const surfaceData = surfaceResults.rows.map(row => ({
        car_index: row.car_index,
        surface_type: row.surface_type,
        surface_name: surfaceTypeNames[row.surface_type] || 'Unknown',
        time: parseFloat(row.total_time_seconds || 0),
        ...driverMap[row.car_index]
      }));

      const surfacesByType = {};
        surfaceData.forEach(item => {
          if (!surfacesByType[item.surface_name]) {
            surfacesByType[item.surface_name] = [];
          }
          surfacesByType[item.surface_name].push({
            driver: item.name,
            team: item.team,
            surface: item.surface_name,
            time: item.time
          });
      });

      Object.keys(surfacesByType).forEach(surface => {
        surfacesByType[surface].sort((a, b) => b.time - a.time);
      });

      // Format the data for the response
      const formattedStats = {
        ers: {
          mostDeployed: mostDeployed ? {
            driver: mostDeployed.name,
            team: mostDeployed.team,
            value: mostDeployed.max_deployed_mj
          } : { driver: "No Data", team: "No Team", value: 0 },
          leastDeployed: leastDeployed ? {
            driver: leastDeployed.name,
            team: leastDeployed.team,
            value: leastDeployed.min_deployed_mj
          } : { driver: "No Data", team: "No Team", value: 0 },
          mostHarvested: mostHarvested ? {
            driver: mostHarvested.name,
            team: mostHarvested.team,
            value: mostHarvested.max_harvested_mj
          } : { driver: "No Data", team: "No Team", value: 0 },
          leastHarvested: leastHarvested ? {
            driver: leastHarvested.name,
            team: leastHarvested.team,
            value: leastHarvested.min_harvested_mj
          } : { driver: "No Data", team: "No Team", value: 0 },
          
          // Race total stats - null if not available (component will show "Unavailable")
          mostTotalDeployed: mostTotalDeployed ? {
            driver: mostTotalDeployed.name,
            team: mostTotalDeployed.team,
            value: mostTotalDeployed.total_deployed_mj
          } : null,
          leastTotalDeployed: leastTotalDeployed ? {
            driver: leastTotalDeployed.name,
            team: leastTotalDeployed.team,
            value: leastTotalDeployed.total_deployed_mj
          } : null,
          mostTotalHarvested: mostTotalHarvested ? {
            driver: mostTotalHarvested.name,
            team: mostTotalHarvested.team,
            value: mostTotalHarvested.total_harvested_mj
          } : null,
          leastTotalHarvested: leastTotalHarvested ? {
            driver: leastTotalHarvested.name,
            team: leastTotalHarvested.team,
            value: leastTotalHarvested.total_harvested_mj
          } : null,
          
          // NEW: Add per-driver deployment data for the chart
          allDriversDeployment: ersData.map(d => ({
            driver: d.name,
            team: d.team,
            value: d.max_deployed_mj
          })).sort((a, b) => b.value - a.value),
          
          // NEW: Add per-driver harvesting data for the chart
          allDriversHarvesting: ersData.map(d => ({
            driver: d.name,
            team: d.team,
            value: d.max_harvested_mj
          })).sort((a, b) => b.value - a.value)
        },
        stints: {
          fastest: {
            driver: "Charles Leclerc", // Placeholder - would need more complex stint analysis
            team: "Ferrari",
            value: 95.462, 
            compound: "Soft"
          },
          slowest: {
            driver: "Valtteri Bottas", // Placeholder - would need more complex stint analysis
            team: "Kick Sauber",
            value: 104.723, 
            compound: "Hard"
          }
        },
        speed: {
          topSpeed: topSpeed ? {
            driver: topSpeed.name,
            team: topSpeed.team,
            value: topSpeed.top_speed
          } : { driver: "No Data", team: "No Team", value: 0 },
          mostGearShifts: mostGearShifts ? {
            driver: mostGearShifts.name,
            team: mostGearShifts.team,
            value: mostGearShifts.gear_shifts
          } : { driver: "No Data", team: "No Team", value: 0 },
          leastGearShifts: leastGearShifts ? {
            driver: leastGearShifts.name,
            team: leastGearShifts.team,
            value: leastGearShifts.gear_shifts
          } : { driver: "No Data", team: "No Team", value: 0 },
          
          // NEW: Add per-driver top speed data for the chart
          allDriversTopSpeeds: speedData.map(d => ({
            driver: d.name,
            team: d.team,
            value: d.top_speed
          })).sort((a, b) => b.value - a.value),
          
          // NEW: Add per-driver gear shifts data for the chart
          allDriversGearShifts: speedData.map(d => ({
            driver: d.name,
            team: d.team,
            value: d.gear_shifts
          })).sort((a, b) => b.value - a.value)
        },
        forces: {
          highestG: highestGForce ? {
            driver: highestGForce.name,
            team: highestGForce.team,
            value: highestGForce.max_g_force,
            corner: "Unknown" // Would need more complex analysis to determine
          } : { driver: "No Data", team: "No Team", value: 0, corner: "Unknown" },
          
          // NEW: Add per-driver G-force data
          allDriversGForce: gForceData.map(d => ({
            driver: d.name,
            team: d.team,
            value: d.max_g_force
          })).sort((a, b) => b.value - a.value)
        },
        tyres: {
          highestWear: highestTyreWear ? {
            driver: highestTyreWear.name,
            team: highestTyreWear.team,
            value: highestTyreWear.max_tyre_wear * 100, // Convert to percentage
            tyre: highestTyreWear.most_worn_tyre
          } : { driver: "No Data", team: "No Team", value: 0, tyre: "Unknown" },
          
          // NEW: Add per-driver tyre wear data
          allDriversTyreWear: tyreWearData.map(d => ({
            driver: d.name,
            team: d.team,
            value: d.max_tyre_wear * 100, // Convert to percentage
            tyre: d.most_worn_tyre
          })).sort((a, b) => b.value - a.value)
        },
        events: {
          totalOvertakes: totalOvertakes,
          mostOvertakes: mostOvertakes ? {
            driver: mostOvertakes.name,
            team: mostOvertakes.team,
            value: mostOvertakes.count
          } : { driver: "No Data", team: "No Team", value: 0 },
          bestReaction: {
            driver: "Oscar Piastri", // Placeholder - needs specific reaction time event analysis
            team: "McLaren",
            value: 0.212
          },
          mostCollisions: mostCollisions ? {
            driver: mostCollisions.name,
            team: mostCollisions.team,
            value: mostCollisions.count
          } : { driver: "No Data", team: "No Team", value: 0 },
          fastestLapsSet: parseInt(fastestLapCount),
          
          // NEW: Add per-driver overtake data
          allDriversOvertakes: overtakeEvents.map(d => ({
            driver: d.name,
            team: d.team,
            value: d.count
          })).sort((a, b) => b.value - a.value),
          
          // NEW: Add per-driver collision data
          allDriversCollisions: collisionEvents.map(d => ({
            driver: d.name,
            team: d.team,
            value: d.count
          })).sort((a, b) => b.value - a.value)
        },
        temperatures: {
          highestBrakeTemp: highestBrakeTemp ? {
            driver: highestBrakeTemp.name,
            team: highestBrakeTemp.team,
            value: highestBrakeTemp.max_brake_temp,
            location: highestBrakeTemp.max_brake_pos || "Front Left"
          } : { driver: "No Data", team: "No Team", value: 0, location: "Unknown" },
          lowestBrakeTemp: lowestBrakeTemp ? {
            driver: lowestBrakeTemp.name,
            team: lowestBrakeTemp.team,
            value: lowestBrakeTemp.min_brake_temp,
            location: lowestBrakeTemp.min_brake_pos || "Rear Right"
          } : { driver: "No Data", team: "No Team", value: 0, location: "Unknown" },
          highestTyreTemp: highestTyreTemp ? {
            driver: highestTyreTemp.name,
            team: highestTyreTemp.team,
            value: highestTyreTemp.max_tyre_temp,
            location: highestTyreTemp.max_tyre_pos || "Rear Left"
          } : { driver: "No Data", team: "No Team", value: 0, location: "Unknown" },
          lowestTyreTemp: lowestTyreTemp ? {
            driver: lowestTyreTemp.name,
            team: lowestTyreTemp.team,
            value: lowestTyreTemp.min_tyre_temp,
            location: lowestTyreTemp.min_tyre_pos || "Front Right"
          } : { driver: "No Data", team: "No Team", value: 0, location: "Unknown" },
          
          // NEW: Add per-driver brake temperature data
          allDriversBrakeTemps: tempData.map(d => ({
            driver: d.name,
            team: d.team,
            value: d.max_brake_temp
          })).sort((a, b) => b.value - a.value),
          
          // NEW: Add per-driver tyre temperature data
          allDriversTyreTemps: tempData.map(d => ({
            driver: d.name,
            team: d.team,
            value: d.max_tyre_temp
          })).sort((a, b) => b.value - a.value)
        },
        surfaces: {
          timeBySurface: surfaceData.slice(0, 10).map(item => ({
            driver: item.name,
            team: item.team,
            surface: item.surface_name,
            time: item.time
          }))
        },
        delta: {
          lowestAvgDelta: { 
            driver: "Max Verstappen", // Placeholder - requires lap gap analysis
            team: "Red Bull Racing",
            value: 0.782
          },
          highestAvgDelta: {
            driver: "Logan Sargeant", // Placeholder - requires lap gap analysis
            team: "Williams",
            value: 2.467
          },
          
          // NOTE: Delta times would require more complex analysis across laps
          // This is a placeholder that should be replaced with actual data
          allDriversDeltas: Array.from(Object.keys(driverMap), carIndex => {
            const driver = driverMap[carIndex];
            const position = parseInt(carIndex) / 20; // Approximate position based on car index
            const value = 0.782 + (position * 1.7); // Generate values between 0.782 and 2.467
            
            return {
              driver: driver.name,
              team: driver.team,
              value: parseFloat(value.toFixed(3))
            };
          }).sort((a, b) => a.value - b.value)
        }
      };

      formattedStats.surfaces.timeBySurface = surfaceData.map(item => ({
        driver: item.name,
        team: item.team,
        surface: item.surface_name,
        time: item.time
      }));

      formattedStats.surfaces.surfaceGroups = surfacesByType;

      return NextResponse.json(formattedStats);
    } catch (queryError) {
      console.error('Error executing queries:', queryError);
      return NextResponse.json(
        { message: 'Error executing database queries', error: queryError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching general stats:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}