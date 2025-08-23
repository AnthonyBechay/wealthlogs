import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Health check endpoint for monitoring
 * Returns system status and basic diagnostics
 */
export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    
    // Check database connection
    let dbStatus = 'disconnected';
    let dbLatency = 0;
    
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'error';
      console.error('Database health check failed:', error);
    }
    
    // System information
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      
      // Service checks
      services: {
        api: 'running',
        database: dbStatus,
      },
      
      // Performance metrics
      metrics: {
        responseTime: Date.now() - startTime,
        databaseLatency: dbLatency,
        memoryUsage: process.memoryUsage(),
      },
      
      // Feature flags
      features: {
        redis: process.env.ENABLE_REDIS === 'true',
        email: process.env.ENABLE_EMAIL === 'true',
        rateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
      }
    };
    
    // Determine overall health status
    if (dbStatus !== 'connected') {
      health.status = 'degraded';
    }
    
    res.status(200).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Simple ping endpoint for basic availability check
 */
export const ping = (req: Request, res: Response) => {
  res.status(200).json({ 
    message: 'pong',
    timestamp: new Date().toISOString()
  });
};

/**
 * Readiness check for container orchestration
 * Checks if the service is ready to accept traffic
 */
export const readinessCheck = async (req: Request, res: Response) => {
  try {
    // Check critical dependencies
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: 'Service not ready',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Liveness check for container orchestration
 * Checks if the service is alive and should not be restarted
 */
export const livenessCheck = (req: Request, res: Response) => {
  // Simple check - if the server can respond, it's alive
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString()
  });
};