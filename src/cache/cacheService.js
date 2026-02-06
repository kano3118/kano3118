import Redis from 'ioredis';

class InMemoryCache {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ttlSeconds) {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(key) {
    this.store.delete(key);
  }
}

export function createCache(redisUrl) {
  if (!redisUrl) {
    return new InMemoryCache();
  }

  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true
  });

  const fallback = new InMemoryCache();
  let connected = false;

  redis.on('error', (err) => {
    console.error('[cache] Redis error, using fallback cache', err.message);
  });

  return {
    async get(key) {
      if (!connected) {
        try {
          await redis.connect();
          connected = true;
        } catch {
          return fallback.get(key);
        }
      }
      try {
        return await redis.get(key);
      } catch {
        return fallback.get(key);
      }
    },
    async set(key, value, ttlSeconds) {
      if (!connected) {
        try {
          await redis.connect();
          connected = true;
        } catch {
          return fallback.set(key, value, ttlSeconds);
        }
      }
      try {
        await redis.set(key, value, 'EX', ttlSeconds);
      } catch {
        await fallback.set(key, value, ttlSeconds);
      }
    },
    async del(key) {
      if (connected) {
        try {
          await redis.del(key);
          return;
        } catch {}
      }
      await fallback.del(key);
    }
  };
}
