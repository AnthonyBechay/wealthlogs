// apps/backend/src/lib/prisma.js
const { PrismaClient } = require('@prisma/client')

const globalForPrisma = global   // reuse in dev / turbo

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ log: ['query'] })

if (process.env.NODE_ENV !== 'production')
  globalForPrisma.prisma = prisma

module.exports = { prisma }
