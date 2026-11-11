import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let client: Redis | null = null;
let subscriber: Redis | null = null;
let isConnected = false;

/**
 * Creates and initializes Redis connection if configured.
 * Implements resilient reconnect strategy and graceful fallback.
 */
export const initRedis = (): { client: Redis | null; subscriber: Redis | null } => {
  const redisUrl = process.env.REDIS_URL || env.REDIS_URL;

  if (!redisUrl && !env.REDIS_ENABLED) {
    logger.info('ℹ️ Redis is not configured or disabled. Operating in resilient in-memory fallback mode.');
    return { client: null, subscriber: null };
  }

  const connectionString = redisUrl || 'redis://localhost:6379';

  const redisOptions: RedisOptions = {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('⚠️ Redis connection attempts exceeded threshold. Operating in in-memory fallback mode.');
        return null; // Stop retrying
      }
      return Math.min(times * 200, 1000);
    },
  };

  try {
    client = new Redis(connectionString, redisOptions);
    subscriber = new Redis(connectionString, redisOptions);

    client.on('connect', () => {
      isConnected = true;
      logger.info('✅ Connected to Redis cache service.');
    });

    client.on('ready', () => {
      isConnected = true;
      logger.info('🚀 Redis client ready to accept commands.');
    });

    client.on('error', (err) => {
      isConnected = false;
      logger.warn(`⚠️ Redis client error (${err.message}). Falling back to local memory store.`);
    });

    client.on('close', () => {
      isConnected = false;
    });

    // Attempt non-blocking connection
    void client.connect().catch((err) => {
      isConnected = false;
      logger.warn(`⚠️ Could not reach Redis server: ${err.message}. Running in in-memory fallback mode.`);
    });

    void subscriber.connect().catch(() => {});
  } catch (error: any) {
    logger.warn(`⚠️ Redis initialization notice: ${error?.message || error}. Falling back to in-memory mode.`);
    client = null;
    subscriber = null;
  }

  return { client, subscriber };
};

export const getRedisClient = (): Redis | null => {
  if (!client && (process.env.REDIS_URL || env.REDIS_URL || env.REDIS_ENABLED)) {
    initRedis();
  }
  return isConnected ? client : null;
};

export const getRedisSubscriber = (): Redis | null => {
  return isConnected ? subscriber : null;
};

export const isRedisAvailable = (): boolean => isConnected;

export const closeRedis = async (): Promise<void> => {
  if (client) {
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
    client = null;
  }
  if (subscriber) {
    try {
      await subscriber.quit();
    } catch {
      subscriber.disconnect();
    }
    subscriber = null;
  }
  isConnected = false;
};

