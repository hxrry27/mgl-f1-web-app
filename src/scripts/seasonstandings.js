const { Pool } = require('pg');
const seasons = require('./data.js').seasons;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'f1telemetry',
    password: 'F>qe~oCFOc9XgpPpFk',
    port: process.env.DB_PORT || 5432,
  });

async function migrateStandings() {
  try {
    for (const [seasonNum, season] of Object.entries(seasons)) {
      if (!season.standings) continue;

      const seasonRes = await pool.query('SELECT id FROM seasons WHERE season = $1', [seasonNum]);
      const seasonId = seasonRes.rows[0]?.id;
      if (!seasonId) {
        //console.log(`Season ${seasonNum} not found, skipping standings`);
        continue;
      }

      // Drivers Standings
      for (const { position, driver, points, team } of season.standings.drivers) {
        const posNum = parseInt(position.replace('P', ''));
        const driverId = (await pool.query('SELECT id FROM drivers WHERE name = $1', [driver])).rows[0]?.id;
        const teamId = (await pool.query('SELECT id FROM teams WHERE name = $1', [team])).rows[0]?.id;

        if (driverId && teamId) {
          await pool.query(
            'INSERT INTO standings (season_id, type, position, driver_id, team_id, points) ' +
            'VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
            [seasonId, 'drivers', posNum, driverId, teamId, points]
          );
        } else {
          //console.log(`Skipping driver standing: ${driver} or team ${team} not found for Season ${seasonNum}`);
        }
      }

      // Constructors Standings
      for (const { position, constructor, points } of season.standings.constructors) {
        const posNum = parseInt(position.replace('P', ''));
        const teamId = (await pool.query('SELECT id FROM teams WHERE name = $1', [constructor])).rows[0]?.id;

        if (teamId) {
          await pool.query(
            'INSERT INTO standings (season_id, type, position, team_id, points) ' +
            'VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
            [seasonId, 'constructors', posNum, teamId, points]
          );
        } else {
          //console.log(`Skipping constructor standing: ${constructor} not found for Season ${seasonNum}`);
        }
      }
    }
    //console.log('Standings migrated successfully');
  } catch (err) {
    console.error('Error migrating standings:', err);
  } finally {
    await pool.end();
  }
}

migrateStandings();