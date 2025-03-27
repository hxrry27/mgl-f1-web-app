import pool from '@/lib/db';

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

// Hardcoded track-to-country mapping
const trackNames = {
  'bahrain': 'Bahrain',
  'jeddah': 'Saudi Arabia',
  'albert-park': 'Australia',
  'suzuka': 'Japan',
  'shanghai': 'China',
  'miami': 'United States',
  'imola': 'Italy',
  'monaco': 'Monaco',
  'catalunya': 'Spain',
  'montreal': 'Canada',
  'red-bull-ring': 'Austria',
  'silverstone': 'United Kingdom',
  'hungaroring': 'Hungary',
  'spa-francorchamps': 'Belgium',
  'zandvoort': 'Netherlands',
  'monza': 'Italy',
  'baku': 'Azerbaijan',
  'marina-bay': 'Singapore',
  'cota': 'United States',
  'mexico-city': 'Mexico',
  'interlagos': 'Brazil',
  'las-vegas': 'United States',
  'lusail': 'Qatar',
  'yas-marina': 'Abu Dhabi',
  'paul-ricard': 'France',
  'portimao': 'Portugal',
  'mugello': 'Italy',
  'sochi': 'Russia',
  'nurburgring': 'Germany',
  'hockenheim': 'Germany'
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const allDrivers = searchParams.get('allDrivers') === 'true';
  const raceSlug = searchParams.get('raceSlug');
  const seasonParam = searchParams.get('season'); // Add this line to get season parameter

  try {
    const seasonRes = await pool.query(
      'SELECT s.season FROM seasons s JOIN races r ON r.season_id = s.id JOIN race_results rr ON rr.race_id = r.id ' +
      'GROUP BY s.season ORDER BY CAST(s.season AS INTEGER) DESC LIMIT 1'
    );

    let currentSeason;
    if (seasonParam) {
      currentSeason = seasonParam;
    } else {
      const seasonRes = await pool.query(
        'SELECT s.season FROM seasons s JOIN races r ON r.season_id = s.id JOIN race_results rr ON rr.race_id = r.id ' +
        'GROUP BY s.season ORDER BY CAST(s.season AS INTEGER) DESC LIMIT 1'
      );
      currentSeason = seasonRes.rows[0]?.season || '11';
    }
    console.log('Current season with results:', currentSeason);

    if (allDrivers) {
      const racesRes = await pool.query(
        'SELECT t.slug, r.date ' +
        'FROM races r JOIN tracks t ON r.track_id = t.id ' +
        'WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) ' +
        'ORDER BY r.date ASC',
        [currentSeason]
      );
      const races = racesRes.rows.map(row => ({
        slug: row.slug,
        name: trackNames[row.slug] || row.slug.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        date: row.date.toISOString().split('T')[0],
      }));
      console.log('Processed races:', races);

      const raceQuery = raceSlug
        ? 'SELECT r.id AS race_id, t.slug, r.date FROM races r JOIN tracks t ON r.track_id = t.id WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) AND t.slug = $2'
        : 'SELECT r.id AS race_id, t.slug, r.date FROM races r JOIN tracks t ON r.track_id = t.id WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) ORDER BY r.date DESC LIMIT 1';
      const latestRaceRes = await pool.query(raceQuery, raceSlug ? [currentSeason, raceSlug] : [currentSeason]);
      const selectedRace = latestRaceRes.rows[0];
      console.log('Selected race for all drivers:', selectedRace);

      const tyreStratRes = await pool.query(
        'WITH selected_race AS (' +
        '  SELECT r.id AS race_id, t.slug, MAX(lt.lap_number) AS total_laps ' +
        '  FROM races r ' +
        '  JOIN tracks t ON r.track_id = t.id ' +
        '  JOIN lap_times lt ON lt.race_id = r.id ' +
        '  WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) ' +
        '  AND r.id = $2 ' +
        '  GROUP BY r.id, t.slug ' +
        '), tyre_changes AS (' +
        '  SELECT lt.race_id, d.name AS driver, lt.lap_number, lt.tyre_compound, ' +
        '         LAG(lt.tyre_compound) OVER (PARTITION BY lt.race_id, d.id ORDER BY lt.lap_number) AS prev_compound, ' +
        '         ROW_NUMBER() OVER (PARTITION BY lt.race_id, d.id ORDER BY lt.lap_number) AS rn ' +
        '  FROM lap_times lt ' +
        '  JOIN selected_race sr ON lt.race_id = sr.race_id ' +
        '  JOIN drivers d ON lt.driver_id = d.id ' +
        ') ' +
        'SELECT sr.slug AS race, tc.driver, tc.tyre_compound AS compound, ' +
        '       tc.lap_number AS start_lap, ' +
        '       LEAD(tc.lap_number - 1, 1, sr.total_laps) OVER (PARTITION BY sr.race_id, tc.driver ORDER BY tc.lap_number) AS end_lap ' +
        'FROM tyre_changes tc ' +
        'JOIN selected_race sr ON tc.race_id = sr.race_id ' +
        'WHERE tc.tyre_compound != tc.prev_compound OR tc.rn = 1 ' +
        'ORDER BY tc.driver, tc.lap_number',
        [currentSeason, selectedRace.race_id]
      );
      const tyreData = tyreStratRes.rows.map(row => ({
        driver: row.driver,
        race: row.race,
        compound: row.compound,
        startLap: row.start_lap,
        endLap: row.end_lap,
      }));

      const allDriversRes = await pool.query(
        'SELECT DISTINCT d.name AS driver ' +
        'FROM race_results rr ' +
        'JOIN races r ON rr.race_id = r.id ' +
        'JOIN seasons s ON r.season_id = s.id ' +
        'JOIN drivers d ON rr.driver_id = d.id ' +
        'WHERE s.season = $1 ' +
        'ORDER BY d.name',
        [currentSeason]
      );
      const seasonDrivers = allDriversRes.rows.map(row => row.driver);

      return Response.json({ tyreData, seasonDrivers, races, season: currentSeason });
    }

    // User-specific logic
    console.log('Fetching stats for username:', username);

    const winsRes = await pool.query(
      'SELECT d.name AS driver, COUNT(*) AS wins ' +
      'FROM race_results rr JOIN drivers d ON rr.driver_id = d.id JOIN races r ON rr.race_id = r.id ' +
      'WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) ' +
      'AND COALESCE(rr.adjusted_position, rr.position) = 1 AND d.name = $2 GROUP BY d.name',
      [currentSeason, username]
    );
    const barData = winsRes.rows.map(row => ({ driver: row.driver, wins: parseInt(row.wins) }));

    let lineData = [{ id: 'Position', data: [] }];
    if (username) {
      const posRes = await pool.query(
        'SELECT COALESCE(rr.adjusted_position, rr.position) AS pos, r.date, t.slug AS track ' +
        'FROM race_results rr JOIN drivers d ON rr.driver_id = d.id JOIN races r ON rr.race_id = r.id JOIN tracks t ON r.track_id = t.id ' +
        'WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) AND d.name = $2 ' +
        'ORDER BY r.date ASC',
        [currentSeason, username]
      );
      lineData = [{
        id: 'Position',
        data: posRes.rows.map((row, index) => ({
          x: index + 1,
          y: row.pos,
          track: row.track,
        })),
      }];
    }

    const statsRes = await pool.query(
      'SELECT ' +
      'SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) = 1 THEN 1 ELSE 0 END) AS wins, ' +
      'SUM(CASE WHEN COALESCE(rr.adjusted_position, rr.position) <= 3 THEN 1 ELSE 0 END) AS podiums, ' +
      'SUM(CASE WHEN rr.status = \'Dnf\' THEN 1 ELSE 0 END) AS dnfs ' +
      'FROM race_results rr JOIN races r ON rr.race_id = r.id JOIN drivers d ON rr.driver_id = d.id ' +
      'WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) AND d.name = $2',
      [currentSeason, username]
    );
    const pieData = [
      { id: 'Wins', value: parseInt(statsRes.rows[0].wins) || 0 },
      { id: 'Podiums', value: parseInt(statsRes.rows[0].podiums) || 0 },
      { id: 'DNFs', value: parseInt(statsRes.rows[0].dnfs) || 0 },
    ];

    const radarRes = await pool.query(
      'WITH recent_races AS (' +
      '  SELECT DISTINCT r.id AS race_id, t.slug, r.date ' +
      '  FROM lap_times lt ' +
      '  JOIN races r ON lt.race_id = r.id ' +
      '  JOIN tracks t ON r.track_id = t.id ' +
      '  JOIN drivers d ON lt.driver_id = d.id ' +
      '  WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) ' +
      '  AND d.name = $2 ' +
      '  AND lt.lap_time_int > 0 ' +
      '  ORDER BY r.date DESC ' +
      '  LIMIT 5 ' +
      '), race_laps AS (' +
      '  SELECT lt.race_id, lt.lap_time_int, rr.slug ' +
      '  FROM lap_times lt ' +
      '  JOIN recent_races rr ON lt.race_id = rr.race_id ' +
      '  JOIN drivers d ON lt.driver_id = d.id ' +
      '  WHERE d.name = $2 ' +
      ') ' +
      'SELECT rl.slug AS race, STDDEV(rl.lap_time_int) / 1000 AS stddev_sec ' +
      'FROM race_laps rl ' +
      'GROUP BY rl.slug ' +
      'ORDER BY MIN(rl.race_id)',
      [currentSeason, username]
    );
    const maxStdDev = Math.max(...radarRes.rows.map(row => parseFloat(row.stddev_sec)), 10);
    const radarData = radarRes.rows.map(row => ({
      race: row.race,
      value: Number((10 - (parseFloat(row.stddev_sec) / maxStdDev) * 10).toFixed(1)),
    }));

    const pointsRes = await pool.query(
      'SELECT r.date, t.slug AS track, COALESCE(rr.adjusted_position, rr.position) AS pos ' +
      'FROM race_results rr JOIN drivers d ON rr.driver_id = d.id JOIN races r ON rr.race_id = r.id JOIN tracks t ON r.track_id = t.id ' +
      'WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) AND d.name = $2 ' +
      'ORDER BY r.date ASC',
      [currentSeason, username]
    );
    let cumulativePoints = 0;
    const areaData = [{
      id: username,
      data: pointsRes.rows.map((row, index) => {
        const points = row.pos <= 10 ? [25, 18, 15, 12, 10, 8, 6, 4, 2, 1][row.pos - 1] : 0;
        cumulativePoints += points;
        return { x: index + 1, y: cumulativePoints, track: row.track };
      }),
    }];

    const raceQueryUser = raceSlug
      ? 'SELECT lt.race_id, t.slug, r.date, MAX(lt.lap_number) AS total_laps FROM lap_times lt JOIN races r ON lt.race_id = r.id JOIN tracks t ON r.track_id = t.id JOIN drivers d ON lt.driver_id = d.id WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) AND d.name = $2 AND t.slug = $3 GROUP BY lt.race_id, t.slug, r.date'
      : 'SELECT lt.race_id, t.slug, r.date, MAX(lt.lap_number) AS total_laps FROM lap_times lt JOIN races r ON lt.race_id = r.id JOIN tracks t ON r.track_id = t.id JOIN drivers d ON lt.driver_id = d.id WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) AND d.name = $2 GROUP BY lt.race_id, t.slug, r.date ORDER BY r.date DESC LIMIT 1';
    const latestRaceRes = await pool.query(raceQueryUser, raceSlug ? [currentSeason, username, raceSlug] : [currentSeason, username]);
    const tyreStratRes = await pool.query(
      'WITH latest_race AS (' +
      '  SELECT lt.race_id, t.slug, MAX(lt.lap_number) AS total_laps ' +
      '  FROM lap_times lt ' +
      '  JOIN races r ON lt.race_id = r.id ' +
      '  JOIN tracks t ON r.track_id = t.id ' +
      '  JOIN drivers d ON lt.driver_id = d.id ' +
      '  WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) ' +
      '  AND d.name = $2 ' +
      '  AND r.id = $3 ' +
      '  GROUP BY lt.race_id, t.slug ' +
      '), tyre_changes AS (' +
      '  SELECT lt.race_id, lt.lap_number, lt.tyre_compound, ' +
      '         LAG(lt.tyre_compound) OVER (PARTITION BY lt.race_id ORDER BY lt.lap_number) AS prev_compound, ' +
      '         ROW_NUMBER() OVER (PARTITION BY lt.race_id ORDER BY lt.lap_number) AS rn ' +
      '  FROM lap_times lt ' +
      '  JOIN latest_race lr ON lt.race_id = lr.race_id ' +
      '  JOIN drivers d ON lt.driver_id = d.id ' +
      '  WHERE d.name = $2 ' +
      ') ' +
      'SELECT lr.slug AS race, tc.tyre_compound AS compound, ' +
      '       tc.lap_number AS start_lap, ' +
      '       LEAD(tc.lap_number - 1, 1, lr.total_laps) OVER (PARTITION BY lr.race_id ORDER BY tc.lap_number) AS end_lap ' +
      'FROM tyre_changes tc ' +
      'JOIN latest_race lr ON tc.race_id = lr.race_id ' +
      'WHERE tc.tyre_compound != tc.prev_compound OR tc.rn = 1 ' +
      'ORDER BY tc.lap_number',
      [currentSeason, username, latestRaceRes.rows[0].race_id]
    );
    const tyreData = tyreStratRes.rows.map(row => ({
      race: row.race,
      compound: row.compound,
      startLap: row.start_lap,
      endLap: row.end_lap,
    }));

    const dropOffRes = await pool.query(
      'WITH selected_race AS (' +
      '  SELECT lt.race_id, t.slug, MAX(lt.lap_number) AS max_lap ' +
      '  FROM lap_times lt ' +
      '  JOIN races r ON lt.race_id = r.id ' +
      '  JOIN tracks t ON r.track_id = t.id ' +
      '  JOIN drivers d ON lt.driver_id = d.id ' +
      '  WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) ' +
      '  AND d.name = $2 ' +
      '  AND r.id = $3 ' +
      '  GROUP BY lt.race_id, t.slug ' +
      '), race_laps AS (' +
      '  SELECT lt.lap_number, ' +
      '         CASE WHEN lt.lap_number = lr.max_lap THEN (lt.s1_time_int + lt.s2_time_int) / 1000.0 ' +
      '              ELSE lt.lap_time_int / 1000.0 END AS lap_time_sec, ' +
      '         lt.tyre_compound ' +
      '  FROM lap_times lt ' +
      '  JOIN selected_race lr ON lt.race_id = lr.race_id ' +
      '  JOIN drivers d ON lt.driver_id = d.id ' +
      '  WHERE d.name = $2 ' +
      '  AND lt.lap_time_int > 0 ' +
      '  ORDER BY lt.lap_number ' +
      ') ' +
      'SELECT * FROM race_laps',
      [currentSeason, username, latestRaceRes.rows[0].race_id]
    );
    const dropOffData = {};
    let currentCompound = null;
    let stintIndex = 0;
    dropOffRes.rows.forEach(row => {
      if (currentCompound !== row.tyre_compound) {
        stintIndex++;
        currentCompound = row.tyre_compound;
      }
      const id = `${row.tyre_compound}-${stintIndex}`;
      if (!dropOffData[id]) {
        dropOffData[id] = { id, data: [] };
      }
      dropOffData[id].data.push({
        x: row.lap_number,
        y: row.lap_time_sec,
      });
    });
    const dropOffChartData = Object.values(dropOffData);

    return Response.json({
      barData,
      lineData,
      pieData,
      radarData,
      areaData,
      tyreData,
      dropOffData: dropOffChartData,
      season: currentSeason,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return new Response(JSON.stringify({ error: 'Failed to load stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}