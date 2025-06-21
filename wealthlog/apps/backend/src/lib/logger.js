// wealthlog/apps/backend/src/lib/logger.js
const winston = require('winston');

const logLevel = process.env.ADVANCED_LOGS === 'true' ? 'debug' : 'info';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});

// Add a helper to easily access the logger
logger.info(`Logger initialized with level: ${logLevel}`);

module.exports = logger;
