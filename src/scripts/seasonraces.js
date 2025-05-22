const { Pool } = require('pg');
const seasons = require('../lib/data.js').seasons;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'f1telemetry',
    password: 'F>qe~oCFOc9XgpPpFk',
    port: process.env.DB_PORT || 5432,
  });

async function migrateRaces() {
  try {
    for (const [seasonNum, season] of Object.entries(seasons)) {
      const seasonRes = await pool.query('SELECT id FROM seasons WHERE season = $1', [seasonNum]);
      const seasonId = seasonRes.rows[0]?.id;
      if (!seasonId) {
        //console.log(`Season ${seasonNum} not found, skipping races`);
        continue;
      }

      for (const [trackSlug, race] of Object.entries(season.races)) {
        const trackRes = await pool.query('SELECT id FROM tracks WHERE slug = $1', [trackSlug]);
        const trackId = trackRes.rows[0]?.id;
        if (!trackId) {
          //console.log(`Track ${trackSlug} not found for Season ${seasonNum}, skipping`);
          continue;
        }

        const fastestLapId = race.fastestLapDriver
          ? (await pool.query('SELECT id FROM drivers WHERE name = $1', [race.fastestLapDriver])).rows[0]?.id
          : null;
        const poleId = race.poleDriver
          ? (await pool.query('SELECT id FROM drivers WHERE name = $1', [race.poleDriver])).rows[0]?.id
          : null;

        const raceRes = await pool.query(
          'INSERT INTO races (season_id, track_id, fastest_lap_driver_id, fastest_lap_time, pole_driver_id, pole_time) ' +
          'VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (season_id, track_id) DO NOTHING RETURNING id',
          [seasonId, trackId, fastestLapId, race.fastestLapTime, poleId, race.poleTime]
        );
        const raceId = raceRes.rows[0]?.id;
        if (!raceId) continue; // Skip if race already exists

        const podium = [race.podium1, race.podium2, race.podium3];
        for (const [pos, driver] of podium.entries()) {
          if (driver) {
            const driverId = (await pool.query('SELECT id FROM drivers WHERE name = $1', [driver])).rows[0]?.id;
            if (driverId) {
              await pool.query(
                'INSERT INTO race_results (race_id, driver_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [raceId, driverId, pos + 1]
              );
            } else {
              //console.log(`Driver ${driver} not found for race ${trackSlug}, Season ${seasonNum}`);
            }
          }
        }
      }
    }
    //console.log('Races and Race Results migrated successfully');
  } catch (err) {
    console.error('Error migrating races:', err);
  } finally {
    await pool.end();
  }
}

migrateRaces();