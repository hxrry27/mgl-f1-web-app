import SeasonTabs from './SeasonTabs';
import SeasonSelector from './SeasonSelector';
import pool from '@/lib/db';
import { teamColors, lightTeams } from '@/lib/data';

const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// Helper function to get available seasons
async function getAvailableSeasons() {
  try {
    const seasonsRes = await pool.query('SELECT season FROM seasons ORDER BY CAST(season AS INTEGER)');
    const seasons = seasonsRes.rows.map(row => row.season);
    return ['overall', 'all-seasons', ...seasons];
  } catch (error) {
    console.error('Error fetching seasons:', error);
    // Fallback to known seasons
    return ['overall', 'all-seasons', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  }
}

// Process race results for dynamic standings calculation
async function processRaceResults(raceIds) {
  const resultsRes = await pool.query(
    'SELECT rr.race_id, rr.position, rr.adjusted_position, d.name AS driver, t.name AS team, rr.time_int, rr.fastest_lap_time_int, ' +
    'rr.penalty_secs_ingame, rr.post_race_penalty_secs, rr.status ' +
    'FROM race_results rr ' +
    'JOIN drivers d ON rr.driver_id = d.id ' +
    'JOIN teams t ON rr.team_id = t.id ' +
    'WHERE rr.race_id = ANY ($1)',
    [raceIds]
  );

  const fastestLapsRes = await pool.query(
    'SELECT rr.race_id, rr.fastest_lap_time_int, d.name AS driver ' +
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

  const driverStandingsMap = new Map();
  const constructorStandingsMap = new Map();

  for (const result of resultsRes.rows) {
    const position = result.adjusted_position || result.position;
    const driver = result.driver;
    const team = result.team;
    const points = position <= 10 ? pointsSystem[position - 1] : 0;
    const isFastestLap = result.fastest_lap_time_int && fastestLapDrivers.get(result.race_id)?.includes(driver) && position <= 10;
    const fastestLapPoint = isFastestLap ? 1 : 0;
    const totalPoints = points + fastestLapPoint;

    if (driverStandingsMap.has(driver)) {
      const existing = driverStandingsMap.get(driver);
      existing.points += totalPoints;
      if (!existing.teams.includes(team)) existing.teams.push(team);
    } else {
      driverStandingsMap.set(driver, { driver, points: totalPoints, teams: [team] });
    }

    if (constructorStandingsMap.has(team)) {
      constructorStandingsMap.get(team).points += totalPoints;
    } else {
      constructorStandingsMap.set(team, { constructor: team, points: totalPoints });
    }
  }

  const driverStandings = Array.from(driverStandingsMap.values())
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({
      position: `P${index + 1}`,
      driver: entry.driver,
      points: Math.round(entry.points),
      teams: entry.teams,
    }));

  const constructorStandings = Array.from(constructorStandingsMap.values())
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({
      position: `P${index + 1}`,
      constructor: entry.constructor,
      points: Math.round(entry.points),
    }));

  return { driverStandings, constructorStandings };
}

// Get season overview stats
async function getSeasonOverview(season) {
  if (season === 'overall') {
    // Get stats across all seasons
    try {
      const totalRacesRes = await pool.query('SELECT COUNT(*) as total FROM races');
      const totalDriversRes = await pool.query('SELECT COUNT(DISTINCT name) as total FROM drivers');
      const totalTeamsRes = await pool.query('SELECT COUNT(DISTINCT name) as total FROM teams');
      const totalSeasonsRes = await pool.query('SELECT COUNT(*) as total FROM seasons');

      return {
        totalRaces: parseInt(totalRacesRes.rows[0]?.total || 0),
        totalDrivers: parseInt(totalDriversRes.rows[0]?.total || 0),
        totalTeams: parseInt(totalTeamsRes.rows[0]?.total || 0),
        totalSeasons: parseInt(totalSeasonsRes.rows[0]?.total || 0),
        isOverall: true
      };
    } catch (error) {
      console.error('Error fetching overall stats:', error);
      return { totalRaces: 0, totalDrivers: 0, totalTeams: 0, totalSeasons: 0, isOverall: true };
    }
  } else {
    // Get stats for specific season
    try {
      const seasonRacesRes = await pool.query(
        'SELECT COUNT(*) as total FROM races WHERE season_id = (SELECT id FROM seasons WHERE season = $1)',
        [season]
      );
      const seasonDriversRes = await pool.query(
        'SELECT COUNT(DISTINCT driver_id) as total FROM lineups WHERE season_id = (SELECT id FROM seasons WHERE season = $1)',
        [season]
      );
      const seasonTeamsRes = await pool.query(
        'SELECT COUNT(DISTINCT team_id) as total FROM lineups WHERE season_id = (SELECT id FROM seasons WHERE season = $1)',
        [season]
      );

      return {
        totalRaces: parseInt(seasonRacesRes.rows[0]?.total || 0),
        totalDrivers: parseInt(seasonDriversRes.rows[0]?.total || 0),
        totalTeams: parseInt(seasonTeamsRes.rows[0]?.total || 0),
        season: season,
        isOverall: false
      };
    } catch (error) {
      console.error('Error fetching season stats:', error);
      return { totalRaces: 0, totalDrivers: 0, totalTeams: 0, season: season, isOverall: false };
    }
  }
}

export default async function SeasonsPage({ params }) {
  const { season } = params;
  const isOverall = season?.toLowerCase() === 'overall';
  const seasonNum = isOverall ? null : parseInt(season);

  let drivers = [], constructors = [], overviewStats = {}, error;
  let availableSeasons = [];

  try {
    // Get available seasons
    availableSeasons = await getAvailableSeasons();
    
    // Get overview stats
    overviewStats = await getSeasonOverview(season);

    if (seasonNum && seasonNum <= 7) {
      // Legacy seasons - use standings table
      const driverRes = await pool.query(
        'SELECT d.name AS driver, t.name AS team, s.points, s.position ' +
        'FROM standings s ' +
        'JOIN drivers d ON s.driver_id = d.id ' +
        'JOIN teams t ON s.team_id = t.id ' +
        'WHERE s.season_id = (SELECT id FROM seasons WHERE season = $1) AND s.type = $2 ' +
        'ORDER BY s.position',
        [season, 'drivers']
      );
      drivers = driverRes.rows.map(row => ({
        position: `P${row.position}`,
        driver: row.driver,
        points: row.points,
        teams: [row.team],
      }));

      const constructorRes = await pool.query(
        'SELECT t.name AS constructor, s.points, s.position ' +
        'FROM standings s ' +
        'JOIN teams t ON s.team_id = t.id ' +
        'WHERE s.season_id = (SELECT id FROM seasons WHERE season = $1) AND s.type = $2 ' +
        'ORDER BY s.position',
        [season, 'constructors']
      );
      constructors = constructorRes.rows.map(row => ({
        position: `P${row.position}`,
        constructor: row.constructor,
        points: row.points,
      }));
    } else if (!isOverall) {
      // Modern seasons - calculate from race results
      const racesRes = await pool.query(
        'SELECT id FROM races WHERE season_id = (SELECT id FROM seasons WHERE season = $1)',
        [season]
      );
      const raceIds = racesRes.rows.map(r => r.id);

      if (raceIds.length > 0) {
        const { driverStandings, constructorStandings } = await processRaceResults(raceIds);
        drivers = driverStandings;
        constructors = constructorStandings;
      }
    } else {
      // Overall standings across all seasons
      const driverStandingsMap = new Map();
      const constructorStandingsMap = new Map();

      // Seasons 1-7 from standings
      const earlyDriverRes = await pool.query(
        'SELECT d.name AS driver, t.name AS team, SUM(s.points) AS points ' +
        'FROM standings s ' +
        'JOIN drivers d ON s.driver_id = d.id ' +
        'JOIN teams t ON s.team_id = t.id ' +
        'WHERE s.season_id IN (SELECT id FROM seasons WHERE season::int BETWEEN 1 AND 7) AND s.type = $1 ' +
        'GROUP BY d.name, t.name',
        ['drivers']
      );
      earlyDriverRes.rows.forEach(row => {
        const existing = driverStandingsMap.get(row.driver) || { points: 0, teams: [] };
        driverStandingsMap.set(row.driver, {
          driver: row.driver,
          points: existing.points + Number(row.points),
          teams: [...new Set([...existing.teams, row.team])],
        });
      });

      const earlyConstructorRes = await pool.query(
        'SELECT t.name AS constructor, SUM(s.points) AS points ' +
        'FROM standings s ' +
        'JOIN teams t ON s.team_id = t.id ' +
        'WHERE s.season_id IN (SELECT id FROM seasons WHERE season::int BETWEEN 1 AND 7) AND s.type = $1 ' +
        'GROUP BY t.name',
        ['constructors']
      );
      earlyConstructorRes.rows.forEach(row => {
        const existing = constructorStandingsMap.get(row.constructor) || { points: 0 };
        constructorStandingsMap.set(row.constructor, {
          constructor: row.constructor,
          points: existing.points + Number(row.points),
        });
      });

      // Seasons 8+ from race_results
      const racesRes = await pool.query(
        'SELECT id FROM races WHERE season_id IN (SELECT id FROM seasons WHERE season::int >= 8)'
      );
      const lateRaceIds = racesRes.rows.map(r => r.id);
      if (lateRaceIds.length > 0) {
        const { driverStandings, constructorStandings } = await processRaceResults(lateRaceIds);
        driverStandings.forEach(entry => {
          const existing = driverStandingsMap.get(entry.driver) || { points: 0, teams: [] };
          driverStandingsMap.set(entry.driver, {
            driver: entry.driver,
            points: existing.points + entry.points,
            teams: [...new Set([...existing.teams, ...entry.teams])],
          });
        });
        constructorStandings.forEach(entry => {
          const existing = constructorStandingsMap.get(entry.constructor) || { points: 0 };
          constructorStandingsMap.set(entry.constructor, {
            constructor: entry.constructor,
            points: existing.points + entry.points,
          });
        });
      }

      drivers = Array.from(driverStandingsMap.values())
        .sort((a, b) => b.points - a.points)
        .map((entry, index) => ({
          position: `P${index + 1}`,
          driver: entry.driver,
          points: Math.round(entry.points),
          teams: entry.teams,
        }));

      constructors = Array.from(constructorStandingsMap.values())
        .sort((a, b) => b.points - a.points)
        .map((entry, index) => ({
          position: `P${index + 1}`,
          constructor: entry.constructor,
          points: Math.round(entry.points),
        }));
    }

    error = null;
  } catch (err) {
    console.error('Error fetching season data:', err);
    error = 'Failed to load season data';
  }

  return (
    <div className="container mx-auto px-4 max-w-6xl">
      {/* Season Header with Selector and Tabs */}
      <SeasonTabs
        season={season}
        isOverall={isOverall}
        drivers={drivers}
        constructors={constructors}
        overviewStats={overviewStats}
        error={error}
        teamColors={teamColors}
        lightTeams={lightTeams}
        availableSeasons={availableSeasons}
      />
    </div>
  );
}

export const dynamic = 'force-dynamic';