// src/lib/migrateRaceResults.js
const { Pool } = require('pg');
const fs = require('fs').promises;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'f1telemetry',
  password: 'F>qe~oCFOc9XgpPpFk', // Replace with your actual password
  port: 5432,
});

const trackNameMap = {
  'Bahrain': 'Bahrain International Circuit',
  'Jeddah': 'Jeddah Corniche Circuit',
  'Melbourne': 'Albert Park Circuit',
  'Baku': 'Baku City Circuit',
  'Miami': 'Miami International Autodrome',
  'Imola': 'Imola',
  'Monaco': 'Circuit de Monaco',
  'Barcelona': 'Circuit de Barcelona-Catalunya',
  'Montreal': 'Circuit Gilles Villeneuve',
  'Spielberg': 'Red Bull Ring',
  'Silverstone': 'Silverstone',
  'Hungaroring': 'Hungaroring',
  'Spa-Francorchamps': 'Circuit de Spa-Francorchamps',
  'Zandvoort': 'Circuit Zandvoort',
  'Monza': 'Monza',
  'Singapore': 'Marina Bay Street Circuit',
  'Suzuka': 'Suzuka',
  'Losail': 'Lusail International Circuit',
  'Austin': 'Circuit of the Americas',
  'Mexico': 'Autódromo Hermanos Rodríguez',
  'Interlagos': 'Interlagos',
  'Las Vegas': 'Las Vegas Street Circuit',
  'Yas Marina': 'Yas Marina Circuit',
  'Shanghai': 'Shanghai International Circuit',
  'Portimão': 'Algarve International Circuit',
  'Paul Ricard': 'Paul Ricard',
};

const driverNameMap = {
  'hxrry27': 'hxrry27',
  'Totsuka': 'Totsuka',
  'Xerxes': 'Xerxes',
  'Evil Tactician': 'Evil Tactician',
  'MagicallyMichael': 'MagicallyMichael',
  'Jober': 'Jober',
  'Kol_ri': 'Kol_ri',
  'Spacey': 'Spacey',
  'SeerUK': 'SeerUK',
  'Andi3810': 'Andi3810',
  'Kesla': 'Kesla',
  'Kyuubi0kid': 'Kyuubi0kid',
  'LFFPicard': 'LFFPicard',
  'Thorston': 'Thorston',
  'Timmeh1090': 'Timmeh1090',
  'Lewis Hamilton': 'Hamilton',
  'Valtteri Bottas': 'Bottas',
  'Max Verstappen': 'Verstappen',
  'Charles Leclerc': 'Leclerc',
  'Sebastian Vettel': 'Vettel',
  'Carlos Sainz Jr.': 'Sainz',
  'Pierre Gasly': 'Gasly',
  'Alexander Albon': 'Albon',
  'Daniel Ricciardo': 'Ricciardo',
  'Sergio Perez': 'Perez',
  'Lando Norris': 'Norris',
  'Kimi Raikkonen': 'Raikkonen',
  'Daniil Kvyat': 'Kvyat',
  'Nico Hülkenberg': 'Hulkenberg',
  'Lance Stroll': 'Stroll',
  'Kevin Magnussen': 'Magnussen',
  'Antonio Giovinazzi': 'Giovinazzi',
  'Romain Grosjean': 'Grosjean',
  'George Russell': 'Russell',
  'Robert Kubica': 'Kubica',
  'Esteban Ocon': 'Ocon',
  'Fernando Alonso': 'Alonso',
  'Mick Schumacher': 'Schumacher',
  'Yuki Tsunoda': 'Tsunoda',
  'Nicholas Latifi': 'Latifi',
  'Zhou Guanyu': 'Zhou',
  'Nyck De Vries': 'De Vries',
  'Oscar Piastri': 'Piastri',
  'Logan Sargeant': 'Sargeant',
  'Liam Lawson': 'Lawson',
  'Jack Doohan': 'Doohan',
  'Andrea Kimi Antonelli': 'Antonelli',
  'Oliver Bearman': 'Bearman',
  'Gabriel Bortoleto': 'Bortoleto',
  'Isack Hadjar': 'Hadjar',
  'Nikita Mazepin': 'Mazepin',
};

async function migrateRaceResults(season) {
  try {
    const combinedData = JSON.parse(await fs.readFile(`combined_race_results_season${season}.json`, 'utf8'));

    const seasonRes = await pool.query('SELECT id FROM seasons WHERE season = $1', [season]);
    let seasonId = seasonRes.rows[0]?.id;
    if (!seasonId) {
      const insertSeason = await pool.query('INSERT INTO seasons (season) VALUES ($1) RETURNING id', [season]);
      seasonId = insertSeason.rows[0].id;
    }

    for (const result of combinedData) {
      const { race, track, driver, team, position, timeInt, fastestLapTimeInt, fastestLapNum, status, gridPosition, pitsCount, stintsRaw, penaltySecsIngame, date } = result;

      const mappedTrackName = trackNameMap[track];
      if (!mappedTrackName) {
        console.error(`No mapping for track: ${track} - Skipping race ${race}`);
        continue;
      }

      let trackRes = track === 'Mexico' ?
        await pool.query('SELECT id FROM tracks WHERE slug = $1', ['mexico']) :
        await pool.query('SELECT id FROM tracks WHERE name = $1', [mappedTrackName]);
      const trackId = trackRes.rows[0]?.id;
      if (!trackId) {
        console.error(`Track not found: ${mappedTrackName} (JSON: ${track}) - Skipping race ${race}`);
        continue;
      }

      const mappedDriverName = driverNameMap[driver] || driver;
      const driverRes = await pool.query('SELECT id FROM drivers WHERE name = $1', [mappedDriverName]);
      const driverId = driverRes.rows[0]?.id;
      if (!driverId) {
        //console.log(`Skipping driver not in DB: ${driver} (mapped to ${mappedDriverName})`);
        continue;
      }

      const teamRes = await pool.query('SELECT id FROM teams WHERE name = $1', [team]);
      const teamId = teamRes.rows[0]?.id;
      if (!teamId) {
        console.warn(`Team not found: ${team} - Skipping ${driver}`);
        continue;
      }

      let raceRes = await pool.query(
        'INSERT INTO races (season_id, track_id, race_number, date) VALUES ($1, $2, $3, $4) ON CONFLICT (season_id, track_id) DO NOTHING RETURNING id',
        [seasonId, trackId, race, date]
      );
      const raceId = raceRes.rows[0]?.id || (await pool.query('SELECT id FROM races WHERE season_id = $1 AND track_id = $2', [seasonId, trackId])).rows[0].id;

      if (raceId) {
        await pool.query(
          `INSERT INTO race_results (race_id, driver_id, team_id, position, time_int, fastest_lap_time_int, fastest_lap_num, status, grid_position, pits_count, stints_raw, penalty_secs_ingame)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (race_id, driver_id) DO UPDATE SET
             team_id = EXCLUDED.team_id,
             position = EXCLUDED.position,
             time_int = EXCLUDED.time_int,
             fastest_lap_time_int = EXCLUDED.fastest_lap_time_int,
             fastest_lap_num = EXCLUDED.fastest_lap_num,
             status = EXCLUDED.status,
             grid_position = EXCLUDED.grid_position,
             pits_count = EXCLUDED.pits_count,
             stints_raw = EXCLUDED.stints_raw,
             penalty_secs_ingame = EXCLUDED.penalty_secs_ingame`,
          [raceId, driverId, teamId, position, timeInt, fastestLapTimeInt, fastestLapNum, status, gridPosition, pitsCount, stintsRaw, penaltySecsIngame]
        );
        //console.log(`Processed ${driver} for Season ${season}, Race ${race} (${track})`);
      }
    }

    //console.log(`Migration complete for Season ${season}`);
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await pool.end();
  }
}

const season = process.argv[2];
if (!season) {
  console.error('Please provide a season number (e.g., node migrateRaceResults.js 8)');
  process.exit(1);
}
migrateRaceResults(season);