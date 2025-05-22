// lib/cachedApi.js - Updated with graceful fallback
import { CacheService, getCacheKey, CACHE_DURATIONS } from './redis.js';

// Cached API response wrapper with graceful fallback
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

// Export cache utilities for direct use
export { CacheService, getCacheKey, CACHE_DURATIONS };