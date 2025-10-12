// // config/redis.js
// const { Redis } = require('@upstash/redis');

// const redisClient = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN,
// });

// class CacheService {
//   constructor() {
//     this.client = redisClient;
//   }

//   async get(key) {
//     try {
//       const data = await this.client.get(key);
//       console.log(`✅ Cache GET: ${key}`, data ? 'HIT' : 'MISS');
//       if (typeof data === 'string') {
//         return JSON.parse(data);
//       }

//       // Upstash ya devuelve los datos parseados, NO necesitas JSON.parse
//       return data;
//     } catch (error) {
//       console.error('❌ Cache GET error:', error.message);
//       return null;
//     }
//   }

//   async setex(key, seconds, value) {
//     try {
//       // Upstash maneja la serialización automáticamente
//       await this.client.setex(key, seconds, value);
//       console.log(`✅ Cache SET: ${key} for ${seconds}s`);
//       return true;
//     } catch (error) {
//       console.error('❌ Cache SET error:', error.message);
//       return false;
//     }
//   }

//   async del(key) {
//     try {
//       await this.client.del(key);
//       console.log(`✅ Cache DEL: ${key}`);
//       return true;
//     } catch (error) {
//       console.error('❌ Cache DEL error:', error.message);
//       return false;
//     }
//   }
// }

// const cacheService = new CacheService();

// module.exports = { redisClient, cacheService };

import { Redis } from '@upstash/redis';

const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

class CacheService {
  private client: Redis;

  constructor() {
    this.client = redisClient;
  }

  async get(key: string): Promise<any> {
    try {
      const data = await this.client.get(key);
      console.log(`✅ Cache GET: ${key}`, data ? 'HIT' : 'MISS');

      if (typeof data === 'string') {
        return JSON.parse(data);
      }

      // Upstash ya devuelve los datos parseados, NO necesitas JSON.parse
      return data;
    } catch (error) {
      console.error('❌ Cache GET error:', (error as Error).message);
      return null;
    }
  }

  async setex(key: string, seconds: number, value: any): Promise<boolean> {
    try {
      // Upstash maneja la serialización automáticamente
      await this.client.setex(key, seconds, value);
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
