import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use SQL-based calculation like the working season-stats API
    const allDriverStatsRes = await pool.query(`
      WITH driver_team_info AS (
        SELECT 
          d.name as driver,
          STRING_AGG(DISTINCT t.name, ', ' ORDER BY t.name) as teams
        FROM race_results rr
        JOIN races r ON rr.race_id = r.id
        JOIN seasons s ON r.season_id = s.id
        JOIN drivers d ON rr.driver_id = d.id
        JOIN teams t ON rr.team_id = t.id
        WHERE CAST(s.season AS INTEGER) >= 6
        GROUP BY d.name
      ),
      race_stats AS (
        SELECT 
          d.name as driver,
          dti.teams as team,
          COUNT(*) as races_entered,
          SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) = 1 THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) <= 3 THEN 1 ELSE 0 END) as podiums,
          SUM(CASE WHEN UPPER(rr.status) IN ('DNF', 'DID NOT FINISH', 'RETIRED') THEN 1 ELSE 0 END) as dnfs,
          SUM(CASE WHEN rr.grid_position = 1 THEN 1 ELSE 0 END) as poles,
          SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) <= 10 
                   AND UPPER(rr.status) NOT IN ('DSQ', 'DISQUALIFIED', 'DNS')
                   THEN CASE COALESCE(rr.adjusted_position, rr.position)
                        WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15 WHEN 4 THEN 12 WHEN 5 THEN 10
                        WHEN 6 THEN 8 WHEN 7 THEN 6 WHEN 8 THEN 4 WHEN 9 THEN 2 WHEN 10 THEN 1
                        ELSE 0 END
                   ELSE 0 END) as points,
          AVG(CASE WHEN UPPER(rr.status) NOT IN ('DNF', 'DID NOT FINISH', 'RETIRED', 'DSQ', 'DISQUALIFIED', 'DNS') 
                   THEN COALESCE(rr.adjusted_position, rr.position)::float 
                   ELSE NULL END) as avg_position,
          (SUM(CASE WHEN UPPER(rr.status) NOT IN ('DNF', 'DID NOT FINISH', 'RETIRED', 'DSQ', 'DISQUALIFIED', 'DNS') THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 as finish_rate
        FROM race_results rr
        JOIN races r ON rr.race_id = r.id
        JOIN seasons s ON r.season_id = s.id
        JOIN drivers d ON rr.driver_id = d.id
        JOIN driver_team_info dti ON d.name = dti.driver
        WHERE CAST(s.season AS INTEGER) >= 6
        GROUP BY d.name, dti.teams
        HAVING COUNT(*) >= 20
      ),
      fastest_laps AS (
        SELECT 
          rr.race_id, 
          MIN(rr.fastest_lap_time_int) as fastest_time
        FROM race_results rr
        JOIN races r ON rr.race_id = r.id
        JOIN seasons s ON r.season_id = s.id
        WHERE CAST(s.season AS INTEGER) >= 6 AND rr.fastest_lap_time_int > 0
        GROUP BY rr.race_id
      ),
      fastest_lap_counts AS (
        SELECT 
          d.name as driver,
          COUNT(*) as fastest_laps
        FROM race_results rr
        JOIN fastest_laps fl ON rr.race_id = fl.race_id AND rr.fastest_lap_time_int = fl.fastest_time
        JOIN races r ON rr.race_id = r.id
        JOIN seasons s ON r.season_id = s.id
        JOIN drivers d ON rr.driver_id = d.id
        WHERE CAST(s.season AS INTEGER) >= 6
        GROUP BY d.name
      )
      SELECT 
        rs.driver,
        rs.team,
        rs.races_entered,
        rs.wins,
        rs.podiums,
        rs.dnfs,
        rs.poles,
        rs.points,
        rs.avg_position,
        rs.finish_rate,
        COALESCE(flc.fastest_laps, 0) as fastest_laps
      FROM race_stats rs
      LEFT JOIN fastest_lap_counts flc ON rs.driver = flc.driver
      ORDER BY rs.points DESC, rs.wins DESC
    `);

    // Calculate cross-season streaks using the working logic from season-stats
    const crossSeasonStreakResults = await pool.query(`
      WITH driver_race_history AS (
        SELECT 
          d.name as driver,
          r.date,
          se.season,
          rr.race_id,
          UPPER(rr.status) as status,
          COALESCE(rr.adjusted_position, rr.position) as final_position,
          ROW_NUMBER() OVER (PARTITION BY d.name ORDER BY r.date, r.id) as race_order,
          ROW_NUMBER() OVER (PARTITION BY d.name ORDER BY r.date DESC, r.id DESC) as reverse_race_order
        FROM race_results rr
        JOIN races r ON rr.race_id = r.id
        JOIN seasons se ON r.season_id = se.id
        JOIN drivers d ON rr.driver_id = d.id
        WHERE CAST(se.season AS INTEGER) >= 6
        ORDER BY d.name, r.date, r.id
      ),
      streak_calculations AS (
        SELECT 
          driver,
          race_order,
          reverse_race_order,
          status,
          final_position,
          -- Finish streak: consecutive races that are NOT DNF/DSQ
          CASE WHEN status NOT IN ('DNF', 'DID NOT FINISH', 'RETIRED', 'DSQ', 'DISQUALIFIED') 
               THEN 1 ELSE 0 END as finished,
          -- Points streak: consecutive races with P10 or better (and finished)
          CASE WHEN status NOT IN ('DNF', 'DID NOT FINISH', 'RETIRED', 'DSQ', 'DISQUALIFIED') 
                    AND final_position <= 10 
               THEN 1 ELSE 0 END as points_finish,
          -- Create group identifiers for consecutive streaks
          race_order - ROW_NUMBER() OVER (
            PARTITION BY driver, 
            CASE WHEN status NOT IN ('DNF', 'DID NOT FINISH', 'RETIRED', 'DSQ', 'DISQUALIFIED') 
                 THEN 1 ELSE 0 END 
            ORDER BY race_order
          ) as finish_streak_group,
          race_order - ROW_NUMBER() OVER (
            PARTITION BY driver, 
            CASE WHEN status NOT IN ('DNF', 'DID NOT FINISH', 'RETIRED', 'DSQ', 'DISQUALIFIED') 
                      AND final_position <= 10 
                 THEN 1 ELSE 0 END 
            ORDER BY race_order
          ) as points_streak_group
        FROM driver_race_history
      ),
      streak_lengths AS (
        SELECT 
          driver,
          finished,
          points_finish,
          finish_streak_group,
          points_streak_group,
          COUNT(*) as streak_length,
          MIN(reverse_race_order) as min_reverse_order
        FROM streak_calculations
        GROUP BY driver, finished, points_finish, finish_streak_group, points_streak_group
      ),
      max_streaks AS (
        SELECT 
          driver,
          MAX(CASE WHEN finished = 1 THEN streak_length ELSE 0 END) as max_finish_streak,
          MAX(CASE WHEN points_finish = 1 THEN streak_length ELSE 0 END) as max_points_streak
        FROM streak_lengths
        GROUP BY driver
      ),
      current_streaks AS (
        SELECT 
          driver,
          MAX(CASE WHEN finished = 1 AND min_reverse_order = 1 THEN streak_length ELSE 0 END) as current_finish_streak,
          MAX(CASE WHEN points_finish = 1 AND min_reverse_order = 1 THEN streak_length ELSE 0 END) as current_points_streak
        FROM streak_lengths
        GROUP BY driver
      )
      SELECT 
        ms.driver,
        ms.max_finish_streak,
        ms.max_points_streak,
        cs.current_finish_streak,
        cs.current_points_streak,
        CASE WHEN cs.current_finish_streak > 0 AND cs.current_finish_streak = ms.max_finish_streak
             THEN true ELSE false END as finish_streak_ongoing,
        CASE WHEN cs.current_points_streak > 0 AND cs.current_points_streak = ms.max_points_streak
             THEN true ELSE false END as points_streak_ongoing
      FROM max_streaks ms
      JOIN current_streaks cs ON ms.driver = cs.driver
    `);

    const streakMap = new Map();
    crossSeasonStreakResults.rows.forEach(row => {
      const finishStreak = parseInt(row.max_finish_streak) || 0;
      const pointsStreak = parseInt(row.max_points_streak) || 0;
      const finishOngoing = row.finish_streak_ongoing;
      const pointsOngoing = row.points_streak_ongoing;
      
      streakMap.set(row.driver, {
        finish_streak: finishOngoing ? `${finishStreak}*` : finishStreak,
        points_streak: pointsOngoing ? `${pointsStreak}*` : pointsStreak
      });
    });

    // Add streak data to driver stats
    const driverStatsWithStreaks = allDriverStatsRes.rows.map(driver => {
      const streaks = streakMap.get(driver.driver) || { finish_streak: 0, points_streak: 0 };
      return {
        ...driver,
        finish_streak: streaks.finish_streak,
        points_streak: streaks.points_streak
      };
    });

    return NextResponse.json({
      isOverall: true,
      driverStats: driverStatsWithStreaks,
      totalDrivers: driverStatsWithStreaks.length
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    //DEBUG: console.error('Error in all-time stats API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch all-time statistics', details: error.message },
      { status: 500 }
    );
  }
}