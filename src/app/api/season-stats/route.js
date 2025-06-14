import pool from '@/lib/db';
import { NextResponse } from 'next/server';

const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

async function calculateSeasonStats(season) {
  try {
    if (season === 'overall') {
      // Get overall stats across all seasons
      const [
        totalRacesRes,
        totalDriversRes,
        totalTeamsRes,
        totalSeasonsRes,
        overallDriverStatsRes,
        overallConstructorStatsRes,
        overallRaceStatsRes
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) as total FROM races'),
        pool.query('SELECT COUNT(DISTINCT name) as total FROM drivers'),
        pool.query('SELECT COUNT(DISTINCT name) as total FROM teams'),
        pool.query('SELECT COUNT(*) as total FROM seasons'),
        
        // Overall driver stats combining legacy and modern seasons
        pool.query(`
          WITH legacy_stats AS (
            SELECT 
              d.name as driver,
              t.name as team,
              SUM(s.points) as total_points,
              COUNT(*) as race_count,
              SUM(CASE WHEN s.position = 1 THEN 1 ELSE 0 END) as wins,
              SUM(CASE WHEN s.position <= 3 THEN 1 ELSE 0 END) as podiums,
              AVG(s.position) as avg_position
            FROM standings s
            JOIN drivers d ON s.driver_id = d.id
            JOIN teams t ON s.team_id = t.id
            JOIN seasons se ON s.season_id = se.id
            WHERE s.type = 'drivers' AND se.season::int BETWEEN 1 AND 7
            GROUP BY d.name, t.name
          ),
          modern_stats AS (
            SELECT
              d.name as driver,
              t.name as team,
              COUNT(*) as race_count,
              SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) = 1 THEN 1 ELSE 0 END) as wins,
              SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) <= 3 THEN 1 ELSE 0 END) as podiums,
              SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) <= 10 
                       THEN ${pointsSystem[0]} - ${pointsSystem[9]} + ${pointsSystem[9]} 
                       ELSE 0 END) as total_points,
              AVG(COALESCE(rr.adjusted_position, rr.position)) as avg_position
            FROM race_results rr
            JOIN races r ON rr.race_id = r.id
            JOIN seasons s ON r.season_id = s.id
            JOIN drivers d ON rr.driver_id = d.id
            JOIN teams t ON rr.team_id = t.id
            WHERE s.season::int >= 8
            GROUP BY d.name, t.name
          )
          SELECT 
            COALESCE(l.driver, m.driver) as driver,
            COALESCE(l.team, m.team) as team,
            COALESCE(l.total_points, 0) + COALESCE(m.total_points, 0) as total_points,
            COALESCE(l.race_count, 0) + COALESCE(m.race_count, 0) as race_count,
            COALESCE(l.wins, 0) + COALESCE(m.wins, 0) as wins,
            COALESCE(l.podiums, 0) + COALESCE(m.podiums, 0) as podiums,
            (COALESCE(l.avg_position * l.race_count, 0) + COALESCE(m.avg_position * m.race_count, 0)) / 
            NULLIF(COALESCE(l.race_count, 0) + COALESCE(m.race_count, 0), 0) as avg_position
          FROM legacy_stats l
          FULL OUTER JOIN modern_stats m ON l.driver = m.driver AND l.team = m.team
          ORDER BY total_points DESC, wins DESC
        `),
        
        // Overall constructor stats
        pool.query(`
          WITH legacy_constructor_stats AS (
            SELECT 
              t.name as constructor,
              SUM(s.points) as total_points
            FROM standings s
            JOIN teams t ON s.team_id = t.id
            JOIN seasons se ON s.season_id = se.id
            WHERE s.type = 'constructors' AND se.season::int BETWEEN 1 AND 7
            GROUP BY t.name
          ),
          modern_constructor_stats AS (
            SELECT
              t.name as constructor,
              SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) <= 10 
                       THEN ${pointsSystem[0]} - ${pointsSystem[9]} + ${pointsSystem[9]} 
                       ELSE 0 END) as total_points
            FROM race_results rr
            JOIN races r ON rr.race_id = r.id
            JOIN seasons s ON r.season_id = s.id
            JOIN teams t ON rr.team_id = t.id
            WHERE s.season::int >= 8
            GROUP BY t.name
          )
          SELECT 
            COALESCE(l.constructor, m.constructor) as constructor,
            COALESCE(l.total_points, 0) + COALESCE(m.total_points, 0) as total_points
          FROM legacy_constructor_stats l
          FULL OUTER JOIN modern_constructor_stats m ON l.constructor = m.constructor
          ORDER BY total_points DESC
        `),
        
        // Overall race statistics
        pool.query(`
          SELECT 
            COUNT(*) as total_races,
            COUNT(DISTINCT CASE WHEN rr.status = 'Dnf' THEN rr.id END) as total_dnfs,
            AVG(rr.fastest_lap_time_int::float / 1000) as avg_fastest_lap
          FROM race_results rr
          JOIN races r ON rr.race_id = r.id
          WHERE rr.fastest_lap_time_int > 0
        `)
      ]);

      return {
        isOverall: true,
        totalRaces: parseInt(totalRacesRes.rows[0]?.total || 0),
        totalDrivers: parseInt(totalDriversRes.rows[0]?.total || 0),
        totalTeams: parseInt(totalTeamsRes.rows[0]?.total || 0),
        totalSeasons: parseInt(totalSeasonsRes.rows[0]?.total || 0),
        topDrivers: overallDriverStatsRes.rows.slice(0, 10),
        topConstructors: overallConstructorStatsRes.rows.slice(0, 10),
        raceStats: overallRaceStatsRes.rows[0]
      };
    } else {
      // Get stats for specific season
      const seasonNum = parseInt(season);
      
      if (seasonNum <= 7) {
        // Legacy seasons - use standings table
        const [
          seasonInfoRes,
          driverStatsRes,
          constructorStatsRes,
          raceStatsRes
        ] = await Promise.all([
          pool.query(`
            SELECT 
              COUNT(DISTINCT r.id) as total_races,
              COUNT(DISTINCT l.driver_id) as total_drivers,
              COUNT(DISTINCT l.team_id) as total_teams
            FROM races r
            JOIN seasons s ON r.season_id = s.id
            LEFT JOIN lineups l ON s.id = l.season_id
            WHERE s.season = $1
          `, [season]),
          
          pool.query(`
            SELECT 
              d.name as driver,
              t.name as team,
              s.points,
              s.position,
              COUNT(CASE WHEN s.position = 1 THEN 1 END) as wins,
              COUNT(CASE WHEN s.position <= 3 THEN 1 END) as podiums,
              0 as dnfs,
              0 as fastest_laps,
              0 as poles,
              s.position::float as avg_position,
              s.position::float as avg_grid_position,
              s.points::float as avg_points,
              0 as penalties,
              0 as dsqs,
              100 as finish_rate,
              0 as finish_streak,
              0 as points_streak,
              0 as places_gained,
              0 as overtakes
            FROM standings s
            JOIN drivers d ON s.driver_id = d.id
            JOIN teams t ON s.team_id = t.id
            JOIN seasons se ON s.season_id = se.id
            WHERE s.type = 'drivers' AND se.season = $1
            ORDER BY s.position
          `, [season]),
          
          pool.query(`
            SELECT 
              t.name as constructor,
              s.points,
              s.position
            FROM standings s
            JOIN teams t ON s.team_id = t.id
            JOIN seasons se ON s.season_id = se.id
            WHERE s.type = 'constructors' AND se.season = $1
            ORDER BY s.position
          `, [season]),
          
          pool.query(`
            SELECT 
              COUNT(*) as total_races,
              0 as total_dnfs,
              0 as avg_fastest_lap
          `)
        ]);

        return {
          isOverall: false,
          season: season,
          totalRaces: parseInt(seasonInfoRes.rows[0]?.total_races || 0),
          totalDrivers: parseInt(seasonInfoRes.rows[0]?.total_drivers || 0),
          totalTeams: parseInt(seasonInfoRes.rows[0]?.total_teams || 0),
          driverStats: driverStatsRes.rows,
          constructorStats: constructorStatsRes.rows,
          raceStats: raceStatsRes.rows[0],
          isLegacy: true
        };
      } else {
        // Modern seasons - calculate from race results
        const [
          seasonInfoRes,
          driverStatsRes,
          constructorStatsRes,
          raceStatsRes,
          fastestLapsRes,
          polesRes
        ] = await Promise.all([
          pool.query(`
            SELECT 
              COUNT(DISTINCT r.id) as total_races,
              COUNT(DISTINCT rr.driver_id) as total_drivers,
              COUNT(DISTINCT rr.team_id) as total_teams
            FROM races r
            JOIN seasons s ON r.season_id = s.id
            LEFT JOIN race_results rr ON r.id = rr.race_id
            WHERE s.season = $1
          `, [season]),
          
          pool.query(`
            SELECT 
              d.name as driver,
              t.name as team,
              COUNT(*) as races_entered,
              SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) = 1 THEN 1 ELSE 0 END) as wins,
              SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) <= 3 THEN 1 ELSE 0 END) as podiums,
              SUM(CASE WHEN rr.status = 'Dnf' THEN 1 ELSE 0 END) as dnfs,
              SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) <= 10 
                       THEN CASE COALESCE(rr.adjusted_position, rr.position)
                            WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15 WHEN 4 THEN 12 WHEN 5 THEN 10
                            WHEN 6 THEN 8 WHEN 7 THEN 6 WHEN 8 THEN 4 WHEN 9 THEN 2 WHEN 10 THEN 1
                            ELSE 0 END
                       ELSE 0 END) as points,
              AVG(COALESCE(rr.adjusted_position, rr.position)) as avg_position,
              AVG(rr.grid_position) as avg_grid_position,
              AVG(CASE WHEN COALESCE(rr.adjusted_position, rr.position) <= 10 
                       THEN CASE COALESCE(rr.adjusted_position, rr.position)
                            WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15 WHEN 4 THEN 12 WHEN 5 THEN 10
                            WHEN 6 THEN 8 WHEN 7 THEN 6 WHEN 8 THEN 4 WHEN 9 THEN 2 WHEN 10 THEN 1
                            ELSE 0 END
                       ELSE 0 END) as avg_points,
              SUM(CASE WHEN rr.penalty_secs_ingame > 0 THEN 1 ELSE 0 END) as penalties,
              SUM(CASE WHEN rr.status = 'Dsq' THEN 1 ELSE 0 END) as dsqs,
              (COUNT(*) - SUM(CASE WHEN rr.status = 'Dnf' THEN 1 ELSE 0 END))::float / COUNT(*) * 100 as finish_rate,
              AVG(COALESCE(rr.grid_position, 0) - COALESCE(COALESCE(rr.adjusted_position, rr.position), 0)) as places_gained
            FROM race_results rr
            JOIN races r ON rr.race_id = r.id
            JOIN seasons s ON r.season_id = s.id
            JOIN drivers d ON rr.driver_id = d.id
            JOIN teams t ON rr.team_id = t.id
            WHERE s.season = $1
            GROUP BY d.name, t.name
            ORDER BY points DESC, wins DESC
          `, [season]),
          
          pool.query(`
            SELECT 
              t.name as constructor,
              SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) <= 10 
                       THEN CASE COALESCE(rr.adjusted_position, rr.position)
                            WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15 WHEN 4 THEN 12 WHEN 5 THEN 10
                            WHEN 6 THEN 8 WHEN 7 THEN 6 WHEN 8 THEN 4 WHEN 9 THEN 2 WHEN 10 THEN 1
                            ELSE 0 END
                       ELSE 0 END) as points
            FROM race_results rr
            JOIN races r ON rr.race_id = r.id
            JOIN seasons s ON r.season_id = s.id
            JOIN teams t ON rr.team_id = t.id
            WHERE s.season = $1
            GROUP BY t.name
            ORDER BY points DESC
          `, [season]),
          
          pool.query(`
            SELECT 
              COUNT(*) as total_races,
              SUM(CASE WHEN rr.status = 'Dnf' THEN 1 ELSE 0 END) as total_dnfs,
              AVG(rr.fastest_lap_time_int::float / 1000) as avg_fastest_lap
            FROM race_results rr
            JOIN races r ON rr.race_id = r.id
            JOIN seasons s ON r.season_id = s.id
            WHERE s.season = $1 AND rr.fastest_lap_time_int > 0
          `, [season]),
          
          // Get fastest lap counts
          pool.query(`
            WITH fastest_laps AS (
              SELECT 
                rr.race_id, 
                MIN(rr.fastest_lap_time_int) as fastest_time
              FROM race_results rr
              JOIN races r ON rr.race_id = r.id
              JOIN seasons s ON r.season_id = s.id
              WHERE s.season = $1 AND rr.fastest_lap_time_int > 0
              GROUP BY rr.race_id
            )
            SELECT 
              d.name as driver,
              COUNT(*) as fastest_laps
            FROM race_results rr
            JOIN fastest_laps fl ON rr.race_id = fl.race_id AND rr.fastest_lap_time_int = fl.fastest_time
            JOIN drivers d ON rr.driver_id = d.id
            JOIN races r ON rr.race_id = r.id
            JOIN seasons s ON r.season_id = s.id
            WHERE s.season = $1
            GROUP BY d.name
            ORDER BY fastest_laps DESC
          `, [season]),
          
          // Get pole positions (grid position = 1)
          pool.query(`
            SELECT 
              d.name as driver,
              COUNT(*) as poles
            FROM race_results rr
            JOIN races r ON rr.race_id = r.id
            JOIN seasons s ON r.season_id = s.id
            JOIN drivers d ON rr.driver_id = d.id
            WHERE s.season = $1 AND rr.grid_position = 1
            GROUP BY d.name
            ORDER BY poles DESC
          `, [season])
        ]);

        // Merge fastest lap and pole data into driver stats
        const fastestLapMap = new Map();
        fastestLapsRes.rows.forEach(row => {
          fastestLapMap.set(row.driver, row.fastest_laps);
        });

        const polesMap = new Map();
        polesRes.rows.forEach(row => {
          polesMap.set(row.driver, row.poles);
        });

        const enhancedDriverStats = driverStatsRes.rows.map(driver => ({
          ...driver,
          fastest_laps: fastestLapMap.get(driver.driver) || 0,
          poles: polesMap.get(driver.driver) || 0,
          finish_streak: 0, // Would need complex calculation
          points_streak: 0, // Would need complex calculation
          overtakes: 0, // Would need telemetry data
          // Ensure numeric fields are proper numbers
          avg_position: typeof driver.avg_position === 'number' ? driver.avg_position : null,
          avg_grid_position: typeof driver.avg_grid_position === 'number' ? driver.avg_grid_position : null,
          avg_points: typeof driver.avg_points === 'number' ? driver.avg_points : null,
          places_gained: typeof driver.places_gained === 'number' ? driver.places_gained : null,
          finish_rate: typeof driver.finish_rate === 'number' ? driver.finish_rate : null
        }));

        return {
          isOverall: false,
          season: season,
          totalRaces: parseInt(seasonInfoRes.rows[0]?.total_races || 0),
          totalDrivers: parseInt(seasonInfoRes.rows[0]?.total_drivers || 0),
          totalTeams: parseInt(seasonInfoRes.rows[0]?.total_teams || 0),
          driverStats: enhancedDriverStats,
          constructorStats: constructorStatsRes.rows,
          raceStats: raceStatsRes.rows[0],
          isLegacy: false
        };
      }
    }
  } catch (error) {
    console.error('Error calculating season stats:', error);
    throw new Error(`Failed to calculate season stats: ${error.message}`);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season') || 'overall';

    const stats = await calculateSeasonStats(season);
    
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error('Error in season stats API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season statistics', details: error.message },
      { status: 500 }
    );
  }
}