// apps/backend/src/lib/prisma.js      ← common‑js export
const { PrismaClient } = require('@prisma/client')
const logger = require('./logger'); // Import the Winston logger

const globalForPrisma = global   // reuse in dev / turbo

let prismaClientOptions = {};

if (process.env.ADVANCED_LOGS === 'true') {
  logger.info('Advanced logs enabled: Prisma query logging is active.');
  prismaClientOptions.log = [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ];
} else {
  // Default logging for production or when advanced logs are off
  prismaClientOptions.log = [
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ];
}

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(prismaClientOptions)

if (process.env.ADVANCED_LOGS === 'true' && !globalForPrisma.prisma) {
  prisma.$on('query', (e) => {
    logger.debug({
      message: 'Prisma Query',
      query: e.query,
      params: e.params,
      duration: e.duration,
      target: e.target,
    });
  });
  prisma.$on('error', (e) => {
    logger.error({ message: 'Prisma Error', error: e.message, target: e.target });
  });
  prisma.$on('info', (e) => {
    logger.info({ message: 'Prisma Info', info: e.message, target: e.target });
  });
  prisma.$on('warn', (e) => {
    logger.warn({ message: 'Prisma Warn', warning: e.message, target: e.target });
  });
} else if (!globalForPrisma.prisma) {
  // Only log errors and warnings if advanced logs are not enabled
  prisma.$on('error', (e) => {
    logger.error({ message: 'Prisma Error', error: e.message, target: e.target });
  });
  prisma.$on('warn', (e) => {
    logger.warn({ message: 'Prisma Warn', warning: e.message, target: e.target });
  });
}

// Add middleware for logging query results if ADVANCED_LOGS is true
if (process.env.ADVANCED_LOGS === 'true' && !globalForPrisma.prisma) { // Check !globalForPrisma.prisma to avoid adding middleware multiple times in dev
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();

    logger.debug({
      message: 'Prisma Query Result',
      model: params.model,
      action: params.action,
      duration: after - before,
      result: result, // This might log large objects, be cautious in production
    });
    return result;
  });
}


if (process.env.NODE_ENV !== 'production')
  globalForPrisma.prisma = prisma

module.exports = { prisma }
