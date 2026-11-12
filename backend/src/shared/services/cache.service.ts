import { getRedisClient, isRedisAvailable } from '../../config/redis';
import { logger } from '../../config/logger';

interface MemoryCacheItem {
  value: any;
  expiresAt: number | null;
}

/**
 * Universal Production Cache Service
 * Bridges high-performance Redis cache with an in-memory fallback.
 */
class CacheService {
  private memoryCache = new Map<string, MemoryCacheItem>();
  private localLocks = new Set<string>();

  /**
   * Retrieves an item from Redis or memory cache.
   */
  public async get<T>(key: string): Promise<T | null> {
    const redis = getRedisClient();
    if (redis && isRedisAvailable()) {
      try {
        const raw = await redis.get(key);
        if (raw !== null) {
          return JSON.parse(raw) as T;
        }
        return null;
      } catch (err: any) {
        logger.warn(`[CacheService] Redis get failed for key "${key}": ${err.message}. Checking memory fallback.`);
      }
    }

    // Memory Fallback
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value as T;
  }

  /**
   * Stores an item in Redis or memory cache with an optional TTL (seconds).
   */
  public async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const redis = getRedisClient();
    if (redis && isRedisAvailable()) {
      try {
        const serialized = JSON.stringify(value);
        if (ttlSeconds > 0) {
          await redis.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await redis.set(key, serialized);
        }
        return;
      } catch (err: any) {
        logger.warn(`[CacheService] Redis set failed for key "${key}": ${err.message}. Using memory fallback.`);
      }
    }

    // Memory Fallback
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryCache.set(key, { value, expiresAt });
  }

  /**
   * Deletes one or multiple keys.
   */
  public async del(keys: string | string[]): Promise<void> {
    const keyList = Array.isArray(keys) ? keys : [keys];
    if (keyList.length === 0) return;

    const redis = getRedisClient();
    if (redis && isRedisAvailable()) {
      try {
        await redis.del(...keyList);
      } catch (err: any) {
        logger.warn(`[CacheService] Redis del failed: ${err.message}`);
      }
    }

    keyList.forEach((k) => this.memoryCache.delete(k));
  }

  /**
   * Deletes all keys matching a pattern (e.g., 'home:*', 'client:*').
   */
  public async delPattern(pattern: string): Promise<void> {
    const redis = getRedisClient();
    if (redis && isRedisAvailable()) {
      try {
        const stream = redis.scanStream({
          match: pattern,
          count: 100,
        });

        stream.on('data', (keys: string[]) => {
          if (keys.length > 0) {
            void redis.del(...keys);
          }
        });
      } catch (err: any) {
        logger.warn(`[CacheService] Redis scan/del pattern "${pattern}" failed: ${err.message}`);
      }
    }

    // Memory regex cleanup
    const regexPattern = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of this.memoryCache.keys()) {
      if (regexPattern.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Acquires a distributed atomic lock (e.g. for sequential invoice generation or DSC staging).
   */
  public async acquireLock(lockKey: string, ttlMs: number = 3000): Promise<boolean> {
    const fullKey = `lock:${lockKey}`;
    const redis = getRedisClient();

    if (redis && isRedisAvailable()) {
      try {
        const acquired = await redis.set(fullKey, 'locked', 'PX', ttlMs, 'NX');
        return acquired === 'OK';
      } catch (err: any) {
        logger.warn(`[CacheService] Redis lock acquisition error: ${err.message}. Using local lock fallback.`);
      }
    }

    // Memory Lock Fallback
    if (this.localLocks.has(fullKey)) {
      return false;
    }
    this.localLocks.add(fullKey);
    setTimeout(() => {
      this.localLocks.delete(fullKey);
    }, ttlMs);
    return true;
  }

  /**
   * Releases a distributed lock.
   */
  public async releaseLock(lockKey: string): Promise<void> {
    const fullKey = `lock:${lockKey}`;
    const redis = getRedisClient();

    if (redis && isRedisAvailable()) {
      try {
        await redis.del(fullKey);
      } catch {}
    }

    this.localLocks.delete(fullKey);
  }

  /**
   * Flushes all cached data.
   */
  public async clear(): Promise<void> {
    const redis = getRedisClient();
    if (redis && isRedisAvailable()) {
      try {
        await redis.flushdb();
      } catch {}
    }
    this.memoryCache.clear();
    this.localLocks.clear();
  }
}

export const cacheService = new CacheService();

