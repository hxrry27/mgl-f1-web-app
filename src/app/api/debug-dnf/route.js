import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season') || '11';

    // Debug query to see what status values exist and count DNFs
    const statusQuery = `
      SELECT 
        rr.status,
        COUNT(*) as count,
        d.name as driver_name
      FROM race_results rr
      JOIN races r ON rr.race_id = r.id
      JOIN seasons s ON r.season_id = s.id
      JOIN drivers d ON rr.driver_id = d.id
      WHERE s.season = $1
      GROUP BY rr.status, d.name
      ORDER BY rr.status, d.name
    `;

    // Also check Max specifically
    const maxQuery = `
      SELECT 
        d.name as driver,
        rr.status,
        COUNT(*) as count
      FROM race_results rr
      JOIN races r ON rr.race_id = r.id
      JOIN seasons s ON r.season_id = s.id
      JOIN drivers d ON rr.driver_id = d.id
      WHERE s.season = $1 AND d.name ILIKE '%max%'
      GROUP BY d.name, rr.status
      ORDER BY d.name, rr.status
    `;

    // Get all unique status values
    const uniqueStatusQuery = `
      SELECT DISTINCT rr.status, COUNT(*) as count
      FROM race_results rr
      JOIN races r ON rr.race_id = r.id
      JOIN seasons s ON r.season_id = s.id
      WHERE s.season = $1
      GROUP BY rr.status
      ORDER BY rr.status
    `;

    const [statusResults, maxResults, uniqueStatusResults] = await Promise.all([
      pool.query(statusQuery, [season]),
      pool.query(maxQuery, [season]),
      pool.query(uniqueStatusQuery, [season])
    ]);

    return NextResponse.json({
      season,
      allDriverStatuses: statusResults.rows,
      maxDriverStatuses: maxResults.rows,
      uniqueStatuses: uniqueStatusResults.rows
    });
  } catch (error) {
    //DEBUG: console.error('Error in debug DNF API:', error);
    return NextResponse.json(
      { error: 'Failed to debug DNF data', details: error.message },
      { status: 500 }
    );
  }
}