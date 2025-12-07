import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season') || '12'; // Default to season 12
    const limit = parseInt(searchParams.get('limit') || '10'); // Default to top 10

    // Get all races for this season
    const racesRes = await pool.query(
      'SELECT id FROM races WHERE season_id = (SELECT id FROM seasons WHERE season = $1)',
      [season]
    );
    const raceIds = racesRes.rows.map(r => r.id);

    if (raceIds.length === 0) {
      return NextResponse.json({ drivers: [] });
    }

    // Get race results
    const resultsRes = await pool.query(
      'SELECT rr.race_id, rr.position, rr.adjusted_position, d.name AS driver, t.name AS team, ' +
      'rr.fastest_lap_time_int, rr.status ' +
      'FROM race_results rr ' +
      'JOIN drivers d ON rr.driver_id = d.id ' +
      'JOIN teams t ON rr.team_id = t.id ' +
      'WHERE rr.race_id = ANY ($1)',
      [raceIds]
    );

    // Get fastest laps
    const fastestLapsRes = await pool.query(
      'SELECT rr.race_id, d.name AS driver ' +
      'FROM race_results rr ' +
      'JOIN drivers d ON rr.driver_id = d.id ' +
      'WHERE rr.race_id = ANY ($1) AND rr.fastest_lap_time_int = (' +
      '  SELECT MIN(fastest_lap_time_int) ' +
      '  FROM race_results rr2 ' +
      '  WHERE rr2.race_id = rr.race_id AND rr2.fastest_lap_time_int > 0' +
      ') AND rr.fastest_lap_time_int > 0',
      [raceIds]
    );

    const fastestLapDrivers = new Map();
    fastestLapsRes.rows.forEach(row => {
      const drivers = fastestLapDrivers.get(row.race_id) || [];
      drivers.push(row.driver);
      fastestLapDrivers.set(row.race_id, drivers);
    });

    // Calculate standings
    const driverStandingsMap = new Map();

    for (const result of resultsRes.rows) {
      const position = result.adjusted_position || result.position;
      const driver = result.driver;
      const team = result.team;
      const points = position <= 10 ? pointsSystem[position - 1] : 0;
      const isFastestLap = result.fastest_lap_time_int && 
                           fastestLapDrivers.get(result.race_id)?.includes(driver) && 
                           position <= 10;
      const fastestLapPoint = isFastestLap && parseInt(season) < 12 ? 1 : 0;
      const totalPoints = points + fastestLapPoint;

      if (driverStandingsMap.has(driver)) {
        const existing = driverStandingsMap.get(driver);
        existing.points += totalPoints;
        if (!existing.teams.includes(team)) existing.teams.push(team);
      } else {
        driverStandingsMap.set(driver, { driver, points: totalPoints, teams: [team], team });
      }
    }

    const drivers = Array.from(driverStandingsMap.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, limit)
      .map((entry, index) => ({
        position: index + 1,
        name: entry.driver,
        team: entry.team,
        points: Math.round(entry.points)
      }));

    return NextResponse.json({ drivers });
  } catch (error) {
    //DEBUG: console.error('Error fetching standings:', error);
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 });
  }
}