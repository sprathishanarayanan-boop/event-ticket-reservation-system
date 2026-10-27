import Redis from 'ioredis';
import { config } from '../config';

export interface ICacheService {
  get<T = any>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<void>;
  isRedisConnected(): boolean;
}

class CacheService implements ICacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, { value: any; expiresAt: number }> = new Map();
  private redisReady: boolean = false;

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    try {
      const url = config.redisUrl || 'redis://localhost:6379';
      this.redis = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: () => null, // Don't hang on reconnection loop if offline
      });

      this.redis.connect().then(() => {
        this.redisReady = true;
        console.log('[Cache] Connected successfully to Redis.');
      }).catch((_err) => {
        this.redisReady = false;
        console.log('[Cache] Redis unavailable. Gracefully operating with high-speed in-memory TTL cache.');
      });

      this.redis.on('error', () => {
        this.redisReady = false;
      });
    } catch {
      this.redisReady = false;
    }
  }

  isRedisConnected(): boolean {
    return this.redisReady;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (this.redisReady && this.redis) {
      try {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (err) {
        console.warn(`[Cache] Redis GET failed for ${key}, falling back to memory.`, (err as Error).message);
      }
    }

    // Memory cache fallback
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: any, ttlSeconds: number = config.redisTtlSeconds): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.redisReady && this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, serialized);
        return;
      } catch (err) {
        console.warn(`[Cache] Redis SET failed for ${key}, caching in memory.`, (err as Error).message);
      }
    }

    // Memory cache
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redisReady && this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        // ignore
      }
    }
    this.memoryCache.delete(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    if (this.redisReady && this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch {
        // ignore
      }
    }

    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }
}

export const cache = new CacheService();
