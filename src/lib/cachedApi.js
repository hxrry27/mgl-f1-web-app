// lib/cachedApi.js - Updated to work with your existing CacheService
import { CacheService, getCacheKey, CACHE_DURATIONS } from './redis.js';

const getBrowserCacheHeaders = (dataType) => {
  const policies = {
    races: 'public, max-age=600, must-revalidate', // 10 minutes
    seasons: 'public, max-age=3600, must-revalidate', // 1 hour  
    telemetry: 'public, max-age=300, must-revalidate', // 5 minutes
    lapData: 'public, max-age=300, must-revalidate', // 5 minutes
    default: 'public, max-age=300, must-revalidate' // 5 minutes
  };
  
  return policies[dataType] || policies.default;
};

// Your existing cachedApiResponse function stays the same
export const cachedApiResponse = async (key, computeFn, duration, req = null) => {
  // Try cache first
  const cached = await CacheService.get(key);
  if (cached) {
    console.log(`🚀 Cache HIT: ${key}`);
    return new Response(JSON.stringify(cached), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${duration}`,
        'X-Cache': 'HIT',
        'X-Cache-Key': key
      }
    });
  }
  
  // If not in cache, compute data
  console.log(`⏳ Cache MISS: ${key} - Computing...`);
  try {
    const data = await computeFn();
   
    // Try to store in cache (will gracefully fail if Redis unavailable)
    const cached = await CacheService.set(key, data, duration);
   
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${duration}`,
        'X-Cache': cached ? 'MISS' : 'MISS-NO-REDIS',
        'X-Cache-Key': key,
        'X-Redis-Available': cached ? 'true' : 'false'
      }
    });
  } catch (error) {
    console.error(`❌ Error computing data for ${key}:`, error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Cache manager using your existing CacheService
export const cacheManager = {
  // Clear specific cache key
  async clearKey(key) {
    console.log(`🧹 Clearing cache key: ${key}`);
    return await CacheService.delete(key);
  },

  // Clear all cache keys matching a pattern
  async clearPattern(pattern) {
    console.log(`🧹 Clearing cache pattern: ${pattern}`);
    return await CacheService.deletePattern(pattern);
  },

  // Clear all cache
  async clearAll() {
    console.log('🧹 Clearing all cache');
    return await CacheService.clear();
  },

  // Get all cache keys (useful for debugging)
  async getKeys(pattern = '*') {
    return await CacheService.getKeys(pattern);
  },

  // Get cache info for debugging
  async getCacheInfo() {
    return await CacheService.getCacheInfo();
  },

  // Clear specific data type caches using your existing getCacheKey functions
  async clearRaces(season = '*') {
    if (season === '*') {
      return await this.clearPattern('races:*');
    } else {
      const key = getCacheKey.races(season);
      return await this.clearKey(key);
    }
  },

  async clearLapData(season = '*', race = '*', sessionType = '*') {
    if (season === '*') {
      return await this.clearPattern('lapdata:*');
    } else {
      const pattern = `lapdata:${season}:${race}:${sessionType}`;
      return await this.clearPattern(pattern);
    }
  },

  async clearTelemetry(season = '*', race = '*', sessionType = '*') {
    const pattern = `telemetry:${season}:${race}:${sessionType}:*`;
    return await this.clearPattern(pattern);
  },

  async clearGeneralStats(season = '*', race = '*', sessionType = '*') {
    if (season === '*') {
      return await this.clearPattern('stats:*');
    } else {
      const pattern = `stats:${season}:${race}:${sessionType}`;
      return await this.clearPattern(pattern);
    }
  },

  async clearTrackDominance(season = '*', race = '*', sessionType = '*') {
    if (season === '*') {
      return await this.clearPattern('dominance:*');
    } else {
      const pattern = `dominance:${season}:${race}:${sessionType}`;
      return await this.clearPattern(pattern);
    }
  },

  // Clear all data for a specific race
  async clearRaceData(season, race, sessionType = '*') {
    console.log(`🧹 Clearing all data for season ${season}, race ${race}, session ${sessionType}`);
    
    const patterns = [
      getCacheKey.races(season),
      `lapdata:${season}:${race}:${sessionType}`,
      `telemetry:${season}:${race}:${sessionType}:*`,
      `stats:${season}:${race}:${sessionType}`,
      `dominance:${season}:${race}:${sessionType}`,
      `fastest:${season}:${race}:${sessionType}`
    ];

    const results = await Promise.all(
      patterns.map(pattern => 
        pattern.includes('*') ? this.clearPattern(pattern) : this.clearKey(pattern)
      )
    );

    return results.every(result => result);
  }
};

// Export your existing utilities
export { CacheService, getCacheKey, CACHE_DURATIONS };