/**
 * Traceability Matrix:
 * - T014: Cấu hình Redis Client, fallback error handling.
 * - SPEC §10: Fallback mechanism - if Redis is down, API must catch error and fallback.
 * - PLAN §5 Risk 1: Graceful fallback về PostgreSQL. Redis unavailable ≠ Auth down.
 */

// Mock ioredis completely
jest.mock('ioredis');

describe('Redis Configuration & Fallback Manager', () => {
  let redisConfig;
  let mockRedisInstance;
  let Redis;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset module cache to re-evaluate initialization with the mock
    jest.resetModules();
    
    // Define the mock instance with Jest spies for its methods
    mockRedisInstance = {
      on: jest.fn((event, cb) => {
        // Store callbacks so we can trigger them in tests
        if (!mockRedisInstance.callbacks) {
          mockRedisInstance.callbacks = {};
        }
        mockRedisInstance.callbacks[event] = cb;
      }),
      emit: jest.fn((event, data) => {
        if (mockRedisInstance.callbacks && mockRedisInstance.callbacks[event]) {
          mockRedisInstance.callbacks[event](data);
        }
      }),
      get: jest.fn(),
      set: jest.fn(),
      hget: jest.fn(),
      del: jest.fn(),
    };
    
    Redis = require('ioredis');
    Redis.mockImplementation(() => mockRedisInstance);
    
    // Require the config again to trigger initialization
    redisConfig = require('../../../src/config/redis');
  });

  describe('Initialization', () => {
    it('should initialize a Redis client with offline queue disabled', () => {
      expect(Redis).toHaveBeenCalledTimes(1);
      // Validate offline queue disabled for safe failover
      const callArgs = Redis.mock.calls[0][1];
      expect(callArgs.enableOfflineQueue).toBe(false);
      expect(callArgs.maxRetriesPerRequest).toBe(1);
    });

    it('should mark redis as available when connect event is emitted', () => {
      expect(redisConfig.isRedisAvailable()).toBe(false);
      redisConfig._simulateEvent('connect');
      expect(redisConfig.isRedisAvailable()).toBe(true);
    });

    it('should mark redis as unavailable when error or close event is emitted', () => {
      redisConfig._simulateEvent('connect');
      expect(redisConfig.isRedisAvailable()).toBe(true);
      
      redisConfig._simulateEvent('error', new Error('Connection lost'));
      expect(redisConfig.isRedisAvailable()).toBe(false);
      
      redisConfig._simulateEvent('connect');
      redisConfig._simulateEvent('close');
      expect(redisConfig.isRedisAvailable()).toBe(false);
    });
  });

  describe('Safe Wrapper Methods (Fallback logic)', () => {
    beforeEach(() => {
      // Simulate connected state for these tests
      redisConfig._simulateEvent('connect');
    });

    describe('getSafe', () => {
      it('should return value when Redis is connected and query succeeds', async () => {
        mockRedisInstance.get.mockResolvedValueOnce('session_data');
        const result = await redisConfig.getSafe('key');
        expect(result).toBe('session_data');
        expect(mockRedisInstance.get).toHaveBeenCalledWith('key');
      });

      it('should return null without querying if Redis is marked unavailable', async () => {
        redisConfig._simulateEvent('close'); // Mark offline
        const result = await redisConfig.getSafe('key');
        expect(result).toBeNull();
        expect(mockRedisInstance.get).not.toHaveBeenCalled();
      });

      it('should catch error, mark unavailable, and return null if query fails', async () => {
        mockRedisInstance.get.mockRejectedValueOnce(new Error('Redis Timeout'));
        const result = await redisConfig.getSafe('key');
        expect(result).toBeNull();
        expect(redisConfig.isRedisAvailable()).toBe(false);
      });
    });

    describe('setSafe', () => {
      it('should set value and return true if successful', async () => {
        mockRedisInstance.set.mockResolvedValueOnce('OK');
        const result = await redisConfig.setSafe('key', 'value', 'EX', 3600);
        expect(result).toBe(true);
        expect(mockRedisInstance.set).toHaveBeenCalledWith('key', 'value', 'EX', 3600);
      });

      it('should return false if Redis is unavailable', async () => {
        redisConfig._simulateEvent('close');
        const result = await redisConfig.setSafe('key', 'value');
        expect(result).toBe(false);
      });

      it('should catch error, mark unavailable, and return false on failure', async () => {
        mockRedisInstance.set.mockRejectedValueOnce(new Error('Memory Limit'));
        const result = await redisConfig.setSafe('key', 'value');
        expect(result).toBe(false);
        expect(redisConfig.isRedisAvailable()).toBe(false);
      });
    });

    describe('hgetSafe', () => {
      it('should return field value successfully', async () => {
        mockRedisInstance.hget.mockResolvedValueOnce('true');
        const result = await redisConfig.hgetSafe('hash', 'field');
        expect(result).toBe('true');
      });

      it('should return null on failure and fallback', async () => {
        mockRedisInstance.hget.mockRejectedValueOnce(new Error('Fail'));
        const result = await redisConfig.hgetSafe('hash', 'field');
        expect(result).toBeNull();
        expect(redisConfig.isRedisAvailable()).toBe(false);
      });
    });

    describe('delSafe', () => {
      it('should delete key and return true', async () => {
        mockRedisInstance.del.mockResolvedValueOnce(1);
        const result = await redisConfig.delSafe('key');
        expect(result).toBe(true);
      });

      it('should return false on failure and fallback', async () => {
        mockRedisInstance.del.mockRejectedValueOnce(new Error('Fail'));
        const result = await redisConfig.delSafe('key');
        expect(result).toBe(false);
        expect(redisConfig.isRedisAvailable()).toBe(false);
      });
    });
  });
});
