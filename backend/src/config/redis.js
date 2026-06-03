/**
 * Redis Client Configuration & Fallback Manager
 */

const Redis = require('ioredis');

let isRedisAvailable = false;
let redisClient = null;

const initRedis = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      // Retry every 5 seconds instead of spamming
      return 5000;
    },
    // EARS[Unwanted]: WHERE Redis is disconnected, THE system SHALL NOT queue commands, but fail immediately for fallback.
    enableOfflineQueue: false
  });

  redisClient.on('connect', () => {
    isRedisAvailable = true;
  });

  let hasLoggedError = false;

  redisClient.on('error', (err) => {
    isRedisAvailable = false;
    // Log error, but prevent crash. Silent in tests to avoid noisy output.
    if (process.env.NODE_ENV !== 'test' && !hasLoggedError) {
      console.error('[Redis] Connection Error - Falling back to DB (Future reconnect errors will be silenced):', err.message);
      hasLoggedError = true;
    }
  });

  redisClient.on('close', () => {
    isRedisAvailable = false;
  });

  return redisClient;
};

// Initialize on require
if (!redisClient) {
  initRedis();
}

/**
 * EARS[State]: WHILE Redis is down, THE system SHALL return null/false safely and fallback to PostgreSQL.
 */

const getSafe = async (key) => {
  if (!isRedisAvailable) return null;
  try {
    return await redisClient.get(key);
  } catch (error) {
    isRedisAvailable = false;
    return null;
  }
};

const setSafe = async (key, value, mode, duration) => {
  if (!isRedisAvailable) return false;
  try {
    if (mode && duration) {
      await redisClient.set(key, value, mode, duration);
    } else {
      await redisClient.set(key, value);
    }
    return true;
  } catch (error) {
    isRedisAvailable = false;
    return false;
  }
};

const hgetSafe = async (key, field) => {
  if (!isRedisAvailable) return null;
  try {
    return await redisClient.hget(key, field);
  } catch (error) {
    isRedisAvailable = false;
    return null;
  }
};

const delSafe = async (key) => {
  if (!isRedisAvailable) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    isRedisAvailable = false;
    return false;
  }
};

module.exports = {
  redisClient,
  isRedisAvailable: () => isRedisAvailable,
  getSafe,
  setSafe,
  hgetSafe,
  delSafe,
  
  // Export for testing
  _simulateEvent: (eventName, err) => {
    redisClient.emit(eventName, err);
  }
};
