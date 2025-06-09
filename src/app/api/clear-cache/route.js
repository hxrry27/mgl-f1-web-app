// src/app/api/clear-cache/route.js
import { NextResponse } from 'next/server';
import { cacheManager } from '@/lib/cachedApi.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { 
      type = 'all',           // 'all', 'races', 'lap-data', 'telemetry', 'race-data', 'pattern'
      season,                 // specific season
      race,                   // specific race
      sessionType,            // specific session type
      pattern                 // custom pattern
    } = body;

    let result = false;
    let message = '';

    switch (type) {
      case 'all':
        result = await cacheManager.clearAll();
        message = 'Cleared entire cache';
        break;

      case 'races':
        result = await cacheManager.clearRaces(season);
        message = `Cleared races cache${season ? ` for season ${season}` : ''}`;
        break;

      case 'lap-data':
        result = await cacheManager.clearLapData(season, race, sessionType);
        message = `Cleared lap data cache${season ? ` for season ${season}` : ''}${race ? ` race ${race}` : ''}`;
        break;

      case 'telemetry':
        result = await cacheManager.clearTelemetry(season, race, sessionType);
        message = `Cleared telemetry cache${season ? ` for season ${season}` : ''}${race ? ` race ${race}` : ''}`;
        break;

      case 'general-stats':
        result = await cacheManager.clearGeneralStats(season, race, sessionType);
        message = `Cleared general stats cache${season ? ` for season ${season}` : ''}${race ? ` race ${race}` : ''}`;
        break;

      case 'track-dominance':
        result = await cacheManager.clearTrackDominance(season, race, sessionType);
        message = `Cleared track dominance cache${season ? ` for season ${season}` : ''}${race ? ` race ${race}` : ''}`;
        break;

      case 'race-data':
        if (!season || !race) {
          return NextResponse.json(
            { success: false, message: 'Season and race required for race-data clearing' },
            { status: 400 }
          );
        }
        result = await cacheManager.clearRaceData(season, race, sessionType);
        message = `Cleared all data for season ${season}, race ${race}${sessionType ? `, session ${sessionType}` : ''}`;
        break;

      case 'pattern':
        if (!pattern) {
          return NextResponse.json(
            { success: false, message: 'Pattern required for pattern clearing' },
            { status: 400 }
          );
        }
        result = await cacheManager.clearPattern(pattern);
        message = `Cleared cache matching pattern: ${pattern}`;
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid cache clear type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result,
      message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear cache', error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to list cache keys and info (useful for debugging)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern') || '*';
    const info = searchParams.get('info') === 'true';
    
    if (info) {
      // Return cache info
      const cacheInfo = await cacheManager.getCacheInfo();
      return NextResponse.json(cacheInfo);
    } else {
      // Return matching keys
      const keys = await cacheManager.getKeys(pattern);
      return NextResponse.json({
        keys,
        count: keys.length,
        pattern
      });
    }
  } catch (error) {
    console.error('Error getting cache info:', error);
    return NextResponse.json(
      { error: 'Failed to get cache info', message: error.message },
      { status: 500 }
    );
  }
}