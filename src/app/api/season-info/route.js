import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season');

    if (!season) {
      return NextResponse.json(
        { error: 'Season parameter is required' },
        { status: 400 }
      );
    }

    if (season === 'overall') {
      return NextResponse.json({
        season: 'overall',
        gameVersion: 'Multiple',
        status: 'All-Time',
        isOverall: true
      });
    }

    // Get season info from database
    const seasonInfoRes = await pool.query(
      'SELECT season, game, dates FROM seasons WHERE season = $1',
      [season]
    );

    if (seasonInfoRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
    }

    const seasonData = seasonInfoRes.rows[0];
    const seasonNum = parseInt(season);

    // Determine season status
    let status;
    if (seasonNum < 11) {
      status = 'Finished';
    } else if (seasonNum === 11) {
      status = 'Active';
    } else {
      status = 'Upcoming';
    }

    return NextResponse.json({
      season: seasonData.season,
      gameVersion: seasonData.game || 'Unknown',
      status: status,
      dates: seasonData.dates,
      isOverall: false
    });

  } catch (error) {
    //DEBUG: console.error('Error in season info API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season info', details: error.message },
      { status: 500 }
    );
  }
}