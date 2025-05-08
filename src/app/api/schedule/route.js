// src/app/api/schedule/route.js
import { Pool } from 'pg';
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const season = searchParams.get('season');
  const track = searchParams.get('track');
  
  try {
    if (season && track) {
      // Single race query - keep as is
      const res = await pool.query(
        'SELECT date::text AS date, time::text AS time FROM schedule WHERE season = $1 AND track = $2 LIMIT 1',
        [season, track]
      );
      const result = {
        date: res.rows[0]?.date || 'TBD',
        time: res.rows[0]?.time || '19:00:00',
      };
      return new Response(JSON.stringify(result), { status: 200 });
    } else if (season) {
      // Season schedule query - ADD race status info
      const res = await pool.query(
        `SELECT 
          s.id, 
          s.season, 
          s.track, 
          s.date::text AS date, 
          s.time::text AS time,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM race_results rr 
              JOIN races r ON rr.race_id = r.id 
              JOIN seasons se ON r.season_id = se.id 
              JOIN tracks t ON r.track_id = t.id 
              WHERE se.season = $1 AND t.slug = s.track
              LIMIT 1
            ) THEN 'completed'
            ELSE 'upcoming'
          END AS race_status
        FROM schedule s
        WHERE s.season = $1 
        ORDER BY s.date`,
        [season]
      );
      
      // Find next race
      const schedule = res.rows;
      const nextRaceIndex = schedule.findIndex(race => race.race_status === 'upcoming');
      
      // Add status classes
      schedule.forEach((race, index) => {
        if (race.race_status === 'completed') {
          race.status_class = 'completed';
        } else if (index === nextRaceIndex) {
          race.status_class = 'next-up';
        } else {
          race.status_class = 'future';
        }
      });
      
      const result = { schedule: schedule };
      return new Response(JSON.stringify(result), { status: 200 });
    } else {
      // Latest season query - ADD race status info (same logic as above)
      const res = await pool.query(
        `SELECT 
          s.id, 
          s.season, 
          s.track, 
          s.date::text AS date, 
          s.time::text AS time,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM race_results rr 
              JOIN races r ON rr.race_id = r.id 
              JOIN seasons se ON r.season_id = se.id 
              JOIN tracks t ON r.track_id = t.id 
              WHERE se.season = (SELECT MAX(season::int)::text FROM schedule) AND t.slug = s.track
              LIMIT 1
            ) THEN 'completed'
            ELSE 'upcoming'
          END AS race_status
        FROM schedule s
        WHERE s.season = (SELECT MAX(season::int)::text FROM schedule)
        ORDER BY s.date`
      );
      
      // Find next race
      const schedule = res.rows;
      const nextRaceIndex = schedule.findIndex(race => race.race_status === 'upcoming');
      
      // Add status classes
      schedule.forEach((race, index) => {
        if (race.race_status === 'completed') {
          race.status_class = 'completed';
        } else if (index === nextRaceIndex) {
          race.status_class = 'next-up';
        } else {
          race.status_class = 'future';
        }
      });
      
      const result = { schedule: schedule };
      return new Response(JSON.stringify(result), { status: 200 });
    }
  } catch (error) {
    console.error('Schedule fetch error:', error);
    return new Response(JSON.stringify({ schedule: [] }), { status: 500 });
  }
}