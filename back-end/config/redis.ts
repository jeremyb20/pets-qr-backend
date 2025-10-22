import { Redis } from '@upstash/redis';

const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

class CacheService {
  private client: Redis;
  private enabled: boolean;
  private timeout: number;

  constructor() {
    this.client = redisClient;
    this.enabled = process.env.REDIS_ENABLED !== 'false'; // Default: enabled
    this.timeout = 100; // ms timeout for cache operations
  }

  async get(key: string): Promise<any> {
    if (!this.enabled) return null;

    try {
      const data = await Promise.race([
        this.client.get(key),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Cache timeout')), this.timeout)
        ),
      ]);

      console.log(`✅ Cache GET: ${key}`, data ? 'HIT' : 'MISS');
      return data;
    } catch (error) {
      console.error('❌ Cache GET error:', (error as Error).message);
      return null; // Fail silently - proceed without cache
    }
  }

  async setex(key: string, seconds: number, value: any): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      await Promise.race([
        this.client.setex(key, seconds, value),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Cache timeout')), this.timeout)
        ),
      ]);
      console.log(`✅ Cache SET: ${key} for ${seconds}s`);
      return true;
    } catch (error) {
      console.error('❌ Cache SET error:', (error as Error).message);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      console.log(`✅ Cache DEL: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ Cache DEL error:', (error as Error).message);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Cache EXISTS error:', (error as Error).message);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await this.client.expire(key, seconds);
      console.log(`✅ Cache EXPIRE: ${key} in ${seconds}s`);
      return true;
    } catch (error) {
      console.error('❌ Cache EXPIRE error:', (error as Error).message);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const result = await this.client.keys(pattern);
      return result;
    } catch (error) {
      console.error('❌ Cache KEYS error:', (error as Error).message);
      return [];
    }
  }

  async flushAll(): Promise<boolean> {
    try {
      await this.client.flushall();
      console.log('✅ Cache FLUSHALL: All keys cleared');
      return true;
    } catch (error) {
      console.error('❌ Cache FLUSHALL error:', (error as Error).message);
      return false;
    }
  }
}

const cacheService = new CacheService();

export { redisClient, cacheService };
export default cacheService;
