// wealthlog/apps/backend/src/lib/redis.js
const IORedis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Basic options with retry strategy
const redisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000); // delay will be 50ms, 100ms, 150ms, ... up to 2s
    return delay;
  },
};

const redisClient = new IORedis(redisUrl, redisOptions);

redisClient.on('connect', () => {
  console.log('Successfully connected to Redis.');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = { redisClient };
