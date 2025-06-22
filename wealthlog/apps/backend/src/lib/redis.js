// wealthlog/apps/backend/src/lib/redis.js
const IORedis = require('ioredis');
const logger = require('./logger'); // Your Winston logger

let redisClient;

// --- Conditional Redis Initialization ---

// If we're in a test environment, use a mock client.
if (process.env.NODE_ENV === 'Development') {
  logger.warn('NODE_ENV is "test". Initializing a mock Redis client.');

  // This is a simple mock object that mimics ioredis behavior.
  // It prevents errors in your code by providing the methods it expects.
  redisClient = {
    // Mimic 'get' to return null, simulating a cache miss.
    get: async (key) => {
      logger.info(`[MOCK REDIS] GET ${key}`);
      return null;
    },
    // Mimic 'set' to return 'OK'.
    set: async (key, value, ...args) => {
      logger.info(`[MOCK REDIS] SET ${key} with args: ${args.join(', ')}`);
      return 'OK';
    },
    // Mimic 'del' to return 1, simulating one key deleted.
    del: async (...keys) => {
      logger.info(`[MOCK REDIS] DEL ${keys.join(' ')}`);
      return keys.length;
    },
    // Add event listeners that do nothing to prevent 'redisClient.on is not a function' errors.
    on: (event, listener) => {
      logger.info(`[MOCK REDIS] Attached no-op listener for event: ${event}`);
    },
    // Add any other methods your application uses so they don't throw errors.
    connect: async () => { logger.info('[MOCK REDIS] connect() called'); },
    quit: async () => { logger.info('[MOCK REDIS] quit() called'); },
  };

} else {
  // --- This is your original code, for production/development ---

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.error('CRITICAL: REDIS_URL environment variable is not set for non-test environment.');
    // In a real app, you might want to exit gracefully
    // throw new Error('REDIS_URL is required to connect to Redis');
    process.exit(1); // Exit if Redis is critical and not configured
  }

  const redisOptions = {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000); // Increased base delay
      logger.warn(`Redis connection retry attempt ${times}. Retrying in ${delay}ms.`);
      return delay;
    },
  };

  redisClient = new IORedis(redisUrl, redisOptions);

  redisClient.on('connect', () => {
    logger.info('Successfully connected to Redis.');
  });

  redisClient.on('error', (err) => {
    // This will now only log errors in non-test environments
    logger.error('Redis connection error:', { message: err.message, stack: err.stack });
  });
}

// Export the conditionally created client
module.exports = { redisClient };