// Create: src/app/api/test-redis/route.js
import { CacheService } from '@/lib/redis';

export async function GET() {
  try {
    const testKey = `test:${Date.now()}`;
    const testData = { test: true, timestamp: new Date().toISOString() };
    
    // Test Redis
    await CacheService.set(testKey, testData, 10);
    const result = await CacheService.get(testKey);
    await CacheService.del(testKey);
    
    return Response.json({ 
      redis_working: !!result,
      message: result ? 'Redis is working!' : 'Redis failed'
    });
  } catch (error) {
    return Response.json({ 
      redis_working: false,
      error: error.message 
    });
  }
}