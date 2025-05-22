// src/lib/seasonlineups.js
const { Pool } = require('pg');
const { seasons } = require('../lib/data');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'f1telemetry',
  password: 'F>qe~oCFOc9XgpPpFk',
  port: process.env.DB_PORT || 5432,
});

async function migrateLineups() {
  try {
    const seasonsArray = Object.entries(seasons);
    for (const [seasonNum, seasonData] of seasonsArray) {
      const seasonRes = await pool.query('SELECT id FROM seasons WHERE season = $1', [seasonNum]);
      const seasonId = seasonRes.rows[0]?.id;
      if (!seasonId) {
        //console.log(`Skipping season ${seasonNum} - not found in DB`);
        continue;
      }

      for (const [driver, teamStr] of Object.entries(seasonData.lineups || {})) {
        const teams = teamStr.split('/').map(t => t.trim());
        //console.log(`Processing ${driver} in Season ${seasonNum}: ${teams.join(', ')}`);
        const driverRes = await pool.query('SELECT id FROM drivers WHERE name = $1', [driver]);
        const driverId = driverRes.rows[0]?.id;
        if (!driverId) {
          //console.log(`Skipping driver ${driver} - not found`);
          continue;
        }

        for (const team of teams) {
          const teamRes = await pool.query('SELECT id FROM teams WHERE name = $1', [team]);
          const teamId = teamRes.rows[0]?.id;
          if (!teamId) {
            //console.log(`Skipping team ${team} for ${driver} - not found in teams table`);
            continue;
          }

          const result = await pool.query(
            'INSERT INTO lineups (season_id, driver_id, team_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id',
            [seasonId, driverId, teamId]
          );
          //console.log(`Added ${driver} to ${team} in Season ${seasonNum} (ID: ${result.rows[0]?.id || 'duplicate'})`);
        }
      }
    }
    //console.log('Lineups migrated successfully');
  } catch (error) {
    console.error('Error migrating lineups:', error);
  } finally {
    await pool.end();
  }
}

migrateLineups();