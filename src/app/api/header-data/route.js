// src/app/api/header-data/route.js
import pool from '@/lib/db';

export async function GET() {
  try {
    const [seasonsRes, driversRes, teamsRes, tracksRes] = await Promise.all([
        pool.query('SELECT season FROM seasons ORDER BY CAST(season AS INTEGER) DESC'),
        pool.query('SELECT name FROM drivers WHERE is_custom = TRUE ORDER BY name'),
        pool.query('SELECT name FROM teams ORDER BY name'),
        pool.query(
          'SELECT DISTINCT t.name, t.country FROM tracks t JOIN races r ON r.track_id = t.id ORDER BY t.country'
        ),
      ]);

    const data = {
      seasons: seasonsRes.rows.map(row => row.season),
      drivers: driversRes.rows.map(row => row.name),
      teams: teamsRes.rows.map(row => row.name),
      tracks: tracksRes.rows.map(row => ({
        name: row.name.toLowerCase().replace(/\s+/g, '-'),
        country: row.country.toUpperCase(),
      })),
    };
    //console.log('API Response:', data); // Debug
    return Response.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ seasons: [], drivers: [], teams: [], tracks: [] }, { status: 500 });
  }
}