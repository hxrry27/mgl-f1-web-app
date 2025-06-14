import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get all drivers who have raced since S6 (same as driver page logic)
    const driversRes = await pool.query(
      'SELECT DISTINCT d.name, d.id ' +
      'FROM drivers d ' +
      'JOIN race_results rr ON rr.driver_id = d.id ' +
      'JOIN races r ON rr.race_id = r.id ' +
      'JOIN seasons s ON r.season_id = s.id ' +
      'WHERE CAST(s.season AS INTEGER) >= 6 ' +
      'ORDER BY d.name'
    );

    const allDriverStats = [];

    // Process each driver individually using the EXACT same logic as driver page
    for (const driver of driversRes.rows) {
      const driverId = driver.id;
      const driverName = driver.name;
      
      // Get season-by-season points for standings table data (S6-S10)
      const seasonStatsRes = await pool.query(
        'SELECT s.season, STRING_AGG(t.name, \'/\') AS teams, st.points ' +
        'FROM seasons s ' +
        'LEFT JOIN lineups l ON l.season_id = s.id AND l.driver_id = $1 ' +
        'LEFT JOIN teams t ON l.team_id = t.id ' +
        'LEFT JOIN standings st ON st.season_id = s.id AND st.driver_id = $1 AND st.type = $2 ' +
        'WHERE CAST(s.season AS INTEGER) >= 6 AND CAST(s.season AS INTEGER) <= 10 ' +
        'GROUP BY s.season, st.points ' +
        'ORDER BY s.season DESC',
        [driverId, 'drivers']
      );

      // Get calculated points for modern seasons (S11+)
      const calculatedPointsRes = await pool.query(
        `SELECT 
          s.season,
          STRING_AGG(DISTINCT t.name, '/') AS teams, 
          SUM(
            CASE 
              WHEN COALESCE(rr.adjusted_position, rr.position) <= 10 
                AND rr.status != 'DSQ' AND rr.status != 'DNS'
              THEN 
                (ARRAY[25, 18, 15, 12, 10, 8, 6, 4, 2, 1])[COALESCE(rr.adjusted_position, rr.position)]
              ELSE 0
            END + 
            CASE 
              WHEN rr.fastest_lap_time_int > 0 
                AND rr.fastest_lap_time_int = (
                  SELECT MIN(rr2.fastest_lap_time_int) 
                  FROM race_results rr2 
                  WHERE rr2.race_id = rr.race_id AND rr2.fastest_lap_time_int > 0
                ) 
                AND COALESCE(rr.adjusted_position, rr.position) <= 10
                AND rr.status != 'DSQ' AND rr.status != 'DNS'
              THEN 1 
              ELSE 0 
            END
          ) AS points
        FROM race_results rr
        JOIN races r ON rr.race_id = r.id
        JOIN seasons s ON r.season_id = s.id
        JOIN teams t ON rr.team_id = t.id
        WHERE CAST(s.season AS INTEGER) >= 11
        AND rr.driver_id = $1
        GROUP BY s.season
        ORDER BY s.season DESC`,
        [driverId]
      );

      // Calculate career totals using EXACT same logic as driver page
      let careerPoints = 0;
      let careerRaces = 0;
      let careerWins = 0;
      let careerPodiums = 0;
      let careerPoles = 0;
      let careerFastestLaps = 0;
      let careerDNFs = 0;
      let totalTeams = new Set();

      // Add points from standings table (S6-S10)
      seasonStatsRes.rows.forEach((row) => {
        if (row.points !== null) {
          careerPoints += parseInt(row.points, 10) || 0;
        }
        if (row.teams && row.teams !== "Didn't Race") {
          row.teams.split('/').forEach(team => totalTeams.add(team));
        }
      });

      // Add points from calculated seasons (S11+)
      calculatedPointsRes.rows.forEach((row) => {
        careerPoints += parseInt(row.points, 10) || 0;
        if (row.teams && row.teams !== "Didn't Race") {
          row.teams.split('/').forEach(team => totalTeams.add(team));
        }
      });

      // Get race results for detailed stats (S6+) - EXACT same query as driver page
      const raceStatsRes = await pool.query(
        'SELECT ' +
        '  rr.race_id, ' +
        '  rr.position, ' +
        '  rr.adjusted_position, ' +
        '  rr.grid_position, ' +
        '  rr.fastest_lap_time_int, ' +
        '  rr.status, ' +
        '  s.season, ' +
        '  t.name AS track_name, ' +
        '  t.id AS track_id ' +
        'FROM race_results rr ' +
        'JOIN races r ON rr.race_id = r.id ' +
        'JOIN seasons s ON r.season_id = s.id ' +
        'JOIN tracks t ON r.track_id = t.id ' +
        'WHERE rr.driver_id = $1 ' +
        'AND CAST(s.season AS INTEGER) >= 6',
        [driverId]
      );

      // Get fastest laps - EXACT same query as driver page
      const allRaceResultsRes = await pool.query(
        'SELECT ' +
        '  rr.race_id, ' +
        '  rr.driver_id, ' +
        '  rr.fastest_lap_time_int, ' +
        '  s.season, ' +
        '  t.name AS track_name ' +
        'FROM race_results rr ' +
        'JOIN races r ON rr.race_id = r.id ' +
        'JOIN seasons s ON r.season_id = s.id ' +
        'JOIN tracks t ON r.track_id = t.id ' +
        'WHERE rr.fastest_lap_time_int > 0 ' +
        'AND rr.driver_id = $1 ' +
        'AND CAST(s.season AS INTEGER) >= 6 ' +
        'AND rr.fastest_lap_time_int = (' +
        '  SELECT MIN(rr2.fastest_lap_time_int) ' +
        '  FROM race_results rr2 ' +
        '  WHERE rr2.race_id = rr.race_id ' +
        '  AND rr2.fastest_lap_time_int > 0' +
        ') ' +
        'ORDER BY s.season DESC, rr.race_id',
        [driverId]
      );

      const raceResults = raceStatsRes.rows;
      const fastestLapRaces = allRaceResultsRes.rows;

      // Process career stats using EXACT same logic as driver page
      careerRaces = raceResults.length;
      careerFastestLaps = fastestLapRaces.length;

      let finishedRaces = 0;
      let totalPositions = 0;

      raceResults.forEach(row => {
        const effectivePosition = row.adjusted_position !== null ? row.adjusted_position : row.position;
        const statusUpper = row.status ? row.status.toUpperCase() : '';
        
        // Count finished races and positions for average
        if (!['DNF', 'DID NOT FINISH', 'RETIRED', 'DSQ', 'DISQUALIFIED', 'DNS'].includes(statusUpper)) {
          finishedRaces++;
          totalPositions += effectivePosition;
        }

        // Count DNFs using case-insensitive matching
        if (['DNF', 'DID NOT FINISH', 'RETIRED'].includes(statusUpper)) {
          careerDNFs++;
        }
        
        // Wins
        if (effectivePosition === 1) {
          careerWins++;
        }
        
        // Podiums
        if (effectivePosition <= 3) {
          careerPodiums++;
        }
        
        // Poles
        if (row.grid_position === 1) {
          careerPoles++;
        }
      });

      // Calculate averages and finish rate
      const avgFinishPosition = finishedRaces > 0 ? totalPositions / finishedRaces : null;
      const finishRate = careerRaces > 0 ? (finishedRaces / careerRaces) * 100 : 0;

      // Only include drivers with at least 20 career races for meaningful stats
      if (careerRaces >= 20) {
        allDriverStats.push({
          driver: driverName,
          team: Array.from(totalTeams).join(', '),
          races_entered: careerRaces,
          wins: careerWins,
          podiums: careerPodiums,
          dnfs: careerDNFs,
          points: careerPoints,
          fastest_laps: careerFastestLaps,
          poles: careerPoles,
          avg_position: avgFinishPosition,
          finish_rate: finishRate
        });
      }
    }

    return NextResponse.json({
      isOverall: true,
      driverStats: allDriverStats,
      totalDrivers: allDriverStats.length
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    console.error('Error in all-time stats API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch all-time statistics', details: error.message },
      { status: 500 }
    );
  }
}