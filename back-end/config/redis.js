// config/redis.js
const { Redis } = require('@upstash/redis');

const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

class CacheService {
  constructor() {
    this.client = redisClient;
  }

  async get(key) {
    try {
      const data = await this.client.get(key);
      console.log(`✅ Cache GET: ${key}`, data ? 'HIT' : 'MISS');
      if (typeof data === 'string') {
        return JSON.parse(data);
      }

      // Upstash ya devuelve los datos parseados, NO necesitas JSON.parse
      return data;
    } catch (error) {
      console.error('❌ Cache GET error:', error.message);
      return null;
    }
  }

  async setex(key, seconds, value) {
    try {
      // Upstash maneja la serialización automáticamente
      await this.client.setex(key, seconds, value);
      console.log(`✅ Cache SET: ${key} for ${seconds}s`);
      return true;
    } catch (error) {
      console.error('❌ Cache SET error:', error.message);
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      console.log(`✅ Cache DEL: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ Cache DEL error:', error.message);
      return false;
    }
  }
}

const cacheService = new CacheService();

module.exports = { redisClient, cacheService };
