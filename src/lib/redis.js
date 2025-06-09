// lib/redis.js - Updated with graceful fallback
import Redis from 'ioredis';

let redis = null;
let redisAvailable = false;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 1, // Reduce retries
    retryDelayOnFailover: 100,
    lazyConnect: true,
    // Add error handling
    enableReadyCheck: false,
    maxRetriesPerRequest: 0, // Don't retry, fail fast
  });

  // Test connection on startup
  redis.ping().then(() => {
    redisAvailable = true;
    console.log('✅ Redis connected successfully');
  }).catch((error) => {
    redisAvailable = false;
    console.log('⚠️  Redis not available, caching disabled');
    redis = null;
  });

  // Handle connection errors gracefully
  redis.on('error', (error) => {
    if (!redisAvailable) return; // Don't spam if we already know it's down
    console.log('⚠️  Redis connection lost, caching disabled');
    redisAvailable = false;
  });

  redis.on('connect', () => {
    redisAvailable = true;
    console.log('✅ Redis reconnected');
  });

} catch (error) {
  console.log('⚠️  Redis initialization failed, caching disabled');
  redis = null;
  redisAvailable = false;
}

// Cache durations (in seconds)
export const CACHE_DURATIONS = {
  TRACK_LAYOUTS: 30 * 24 * 60 * 60, // 30 days
  SEASONS: 24 * 60 * 60,            // 24 hours
  RACES: 24 * 60 * 60,              // 24 hours  
  LAP_DATA: 6 * 60 * 60,            // 6 hours
  TELEMETRY: 6 * 60 * 60,           // 6 hours
  GENERAL_STATS: 6 * 60 * 60,       // 6 hours
  TRACK_DOMINANCE: 6 * 60 * 60,     // 6 hours
  FASTEST_LAPS: 12 * 60 * 60,       // 12 hours
  SHORT_CACHE: 30 * 60,             // 30 minutes
};

// Cache key generators
export const getCacheKey = {
  seasons: () => 'seasons:all',
  races: (season) => `races:${season}`,
  lapData: (season, raceSlug, sessionType) => `lapdata:${season}:${raceSlug}:${sessionType}`,
  telemetry: (season, raceSlug, sessionType, lap, driver) => 
    `telemetry:${season}:${raceSlug}:${sessionType}:${lap}:${driver}`,
  generalStats: (season, raceSlug, sessionType) => 
    `stats:${season}:${raceSlug}:${sessionType}`,
  trackDominance: (season, raceSlug, sessionType) => 
    `dominance:${season}:${raceSlug}:${sessionType}`,
  fastestLaps: (season, raceSlug, sessionType) => 
    `fastest:${season}:${raceSlug}:${sessionType}`,
  trackLayout: (trackSlug) => `layout:${trackSlug}`,
};

// Cache utilities with graceful fallback
export class CacheService {
  static async get(key) {
    if (!redisAvailable || !redis) {
      return null; // Gracefully return null instead of erroring
    }

    try {
      const data = await redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error.message);
      redisAvailable = false; // Mark as unavailable
      return null;
    }
  }

  static async set(key, data, duration = CACHE_DURATIONS.SHORT_CACHE) {
    if (!redisAvailable || !redis) {
      return false; // Gracefully return false instead of erroring
    }

    try {
      await redis.setex(key, duration, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error.message);
      redisAvailable = false; // Mark as unavailable
      return false;
    }
  }

  static async del(key) {
    if (!redisAvailable || !redis) {
      return false;
    }

    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error.message);
      return false;
    }
  }

  static async exists(key) {
    if (!redisAvailable || !redis) {
      return false;
    }

    try {
      return await redis.exists(key);
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error.message);
      return false;
    }
  }

  // Get cache stats
  static async getStats() {
    if (!redisAvailable || !redis) {
      return { available: false, message: 'Redis not connected' };
    }

    try {
      const info = await redis.info('memory');
      const keyspace = await redis.info('keyspace');
      return {
        available: true,
        memory: info,
        keyspace: keyspace,
        keys: await redis.dbsize()
      };
    } catch (error) {
      console.error('Redis STATS error:', error.message);
      return { available: false, error: error.message };
    }
  }

  static async delete(key) {
    if (!redisAvailable || !redis) {
      console.warn('Redis not available for cache deletion');
      return false;
    }

    try {
      const result = await redis.del(key);
      console.log(`🗑️ Deleted cache key: ${key} (${result} keys deleted)`);
      return result > 0;
    } catch (error) {
      console.error(`Redis DELETE error for key ${key}:`, error.message);
      redisAvailable = false;
      return false;
    }
  }

  static async deletePattern(pattern) {
    if (!redisAvailable || !redis) {
      console.warn('Redis not available for pattern deletion');
      return false;
    }

    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        console.log(`🔍 No keys found matching pattern: ${pattern}`);
        return true;
      }
      
      const result = await redis.del(...keys);
      console.log(`🗑️ Deleted ${result} keys matching pattern: ${pattern}`);
      return true;
    } catch (error) {
      console.error(`Redis DELETE PATTERN error for pattern ${pattern}:`, error.message);
      redisAvailable = false;
      return false;
    }
  }

  static async clear() {
    if (!redisAvailable || !redis) {
      console.warn('Redis not available for cache clearing');
      return false;
    }

    try {
      await redis.flushall();
      console.log('🗑️ Cleared entire Redis cache');
      return true;
    } catch (error) {
      console.error('Redis CLEAR error:', error.message);
      redisAvailable = false;
      return false;
    }
  }

  static async getKeys(pattern = '*') {
    if (!redisAvailable || !redis) {
      console.warn('Redis not available for key listing');
      return [];
    }

    try {
      const keys = await redis.keys(pattern);
      return keys;
    } catch (error) {
      console.error(`Redis GET KEYS error for pattern ${pattern}:`, error.message);
      redisAvailable = false;
      return [];
    }
  }

  // Utility method to get cache info for debugging
  static async getCacheInfo() {
    if (!redisAvailable || !redis) {
      return { available: false, message: 'Redis not connected' };
    }

    try {
      const keys = await redis.keys('*');
      const keysByType = {};
      
      keys.forEach(key => {
        const type = key.split(':')[0];
        keysByType[type] = (keysByType[type] || 0) + 1;
      });

      return {
        available: true,
        totalKeys: keys.length,
        keysByType,
        sampleKeys: keys.slice(0, 10) // Show first 10 keys as samples
      };
    } catch (error) {
      console.error('Redis CACHE INFO error:', error.message);
      return { available: false, error: error.message };
    }
  }

}

export default redis;