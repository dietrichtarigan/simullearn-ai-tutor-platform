import { Redis } from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { RateLimiters, SubscriptionTier } from '@/types/api';

// Initialize Redis client with reconnection handling
const getRedisClient = () => {
  const client = new Redis(process.env.REDIS_URL!, {
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 3) {
        console.error('Redis connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 200, 1000);
    }
  });

  client.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  return client;
};

export const redis = getRedisClient();

// Configure rate limiters for different endpoints
const createRateLimiter = (points: number, duration: number) => {
  return new RateLimiterRedis({
    storeClient: redis,
    points, // Number of requests
    duration, // Per number of seconds
    blockDuration: 60 * 15, // Block for 15 minutes if exceeded
  });
};

// Rate limiters for different subscription tiers
export const rateLimiters: RateLimiters = {
  tutorChat: {
    free: createRateLimiter(20, 60 * 60 * 24), // 20 requests per day
    premium_basic: createRateLimiter(100, 60 * 60 * 24), // 100 requests per day
    premium_plus: createRateLimiter(300, 60 * 60 * 24), // 300 requests per day
    b2b: createRateLimiter(1000, 60 * 60 * 24), // 1000 requests per day
  },
  api: createRateLimiter(100, 60), // 100 requests per minute for general API endpoints
};

// Session storage with Redis
export const sessionStorage = {
  async set(sessionId: string, data: any, expiryInSeconds: number = 3600) {
    try {
      await redis.set(
        `session:${sessionId}`,
        JSON.stringify(data),
        'EX',
        expiryInSeconds
      );
    } catch (error) {
      console.error('Redis session storage error:', error);
      throw new Error('Session storage failed');
    }
  },

  async get(sessionId: string) {
    try {
      const data = await redis.get(`session:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis session retrieval error:', error);
      return null;
    }
  },

  async delete(sessionId: string) {
    try {
      await redis.del(`session:${sessionId}`);
    } catch (error) {
      console.error('Redis session deletion error:', error);
    }
  }
};

// AI Chat history management with token tracking
export const chatStorage = {
  async saveMessage(userId: string, message: string, tokens: number) {
    const key = `chat:${userId}`;
    try {
      // Get current chat history
      const history = await redis.lrange(key, 0, -1);
      
      // If history length exceeds 10 messages, remove oldest
      if (history.length >= 10) {
        await redis.lpop(key);
      }
      
      // Add new message
      await redis.rpush(key, JSON.stringify({
        message,
        tokens,
        timestamp: Date.now()
      }));
      
      // Set expiry (3 months)
      await redis.expire(key, 60 * 60 * 24 * 90);
      
      // Track token usage
      await this.incrementTokenUsage(userId, tokens);
    } catch (error) {
      console.error('Chat storage error:', error);
      throw new Error('Failed to save chat message');
    }
  },

  async getHistory(userId: string, limit: number = 10) {
    try {
      const messages = await redis.lrange(`chat:${userId}`, -limit, -1);
      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      console.error('Chat history retrieval error:', error);
      return [];
    }
  },

  async incrementTokenUsage(userId: string, tokens: number) {
    const key = `tokens:${userId}:${new Date().toISOString().split('T')[0]}`;
    try {
      await redis.incrby(key, tokens);
      // Expire after 30 days for tracking purposes
      await redis.expire(key, 60 * 60 * 24 * 30);
    } catch (error) {
      console.error('Token tracking error:', error);
    }
  },

  async getDailyTokenUsage(userId: string) {
    const key = `tokens:${userId}:${new Date().toISOString().split('T')[0]}`;
    try {
      const tokens = await redis.get(key);
      return parseInt(tokens || '0');
    } catch (error) {
      console.error('Token usage retrieval error:', error);
      return 0;
    }
  }
};

// Health check function
export const checkRedisHealth = async () => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
};
