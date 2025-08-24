/**
 * Service Implementation for Backend
 * JavaScript version for Node.js runtime with shared security features
 */

// Check if shared package is available
let sharedAvailable = false;
try {
  require.resolve('@wealthlog/shared');
  sharedAvailable = true;
} catch (e) {
  console.warn('[@wealthlog/shared not found, using fallback implementations');
}

// Import from shared if available, otherwise use fallbacks
const shared = sharedAvailable ? require('@wealthlog/shared') : {};

// Express middleware for error handling
const errorMiddleware = (err, req, res, next) => {
  // Log error
  console.error('Error:', {
    message: err.message,
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500
  });
  
  // Send error response
  const isDevelopment = process.env.NODE_ENV !== 'production';
  res.status(err.statusCode || err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(isDevelopment && { stack: err.stack })
  });
};

// Validation middleware factory
const validateRequest = (schema) => {
  return (req, res, next) => {
    // Simple validation if shared not available
    if (!sharedAvailable || !shared.DataValidator) {
      next();
      return;
    }
    
    try {
      const result = shared.DataValidator.validate(req.body, schema);
      
      if (!result.isValid) {
        const error = new Error('Validation failed');
        error.statusCode = 400;
        error.details = result.errors;
        throw error;
      }
      
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Performance monitoring middleware
const performanceMiddleware = (req, res, next) => {
  req.startTime = Date.now();
  
  // Override res.send to capture response time
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    
    // Log performance metric
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    res.setHeader('X-Response-Time', `${duration}ms`);
    return originalSend.call(this, data);
  };
  
  next();
};

// Create rate limiter
const createRateLimiter = (maxRequests = 100, windowMs = 60000) => {
  const attempts = new Map();
  
  // Cleanup old entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, times] of attempts.entries()) {
      const validTimes = times.filter(time => now - time < windowMs);
      if (validTimes.length === 0) {
        attempts.delete(key);
      } else {
        attempts.set(key, validTimes);
      }
    }
  }, 60000);
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Get attempts for this IP
    let userAttempts = attempts.get(key) || [];
    
    // Filter out old attempts
    userAttempts = userAttempts.filter(time => now - time < windowMs);
    
    if (userAttempts.length >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000),
        remaining: 0
      });
      return;
    }
    
    // Add current attempt
    userAttempts.push(now);
    attempts.set(key, userAttempts);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - userAttempts.length);
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
    
    next();
  };
};

// Security headers middleware
const securityHeadersMiddleware = (req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  next();
};

// Request logging middleware
const requestLoggingMiddleware = (req, res, next) => {
  const crypto = require('crypto');
  const requestId = crypto.randomBytes(8).toString('hex');
  
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Log request
  console.log(`[${requestId}] ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  next();
};

// Setup health checks
const setupHealthChecks = (prisma) => {
  console.log('Health checks configured');
  
  // Return health check function
  return async () => {
    const checks = {
      database: false,
      memory: false
    };
    
    // Check database
    try {
      if (prisma) {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = true;
      }
    } catch (error) {
      console.error('Database health check failed:', error);
    }
    
    // Check memory
    const used = process.memoryUsage();
    const heapUsedMB = used.heapUsed / 1024 / 1024;
    checks.memory = heapUsedMB < 500;
    
    return {
      healthy: checks.database && checks.memory,
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  };
};

// Async handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Sanitize input (basic XSS protection)
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    // Basic HTML entity encoding
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};

// Input sanitization middleware
const sanitizationMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  next();
};

// Setup all middleware for Express app
const setupMiddleware = (app, prisma) => {
  // Apply security middleware
  app.use(securityHeadersMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(performanceMiddleware);
  app.use(sanitizationMiddleware);
  
  // Setup health check endpoint
  const healthCheck = setupHealthChecks(prisma);
  
  app.get('/health', asyncHandler(async (req, res) => {
    const health = await healthCheck();
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json(health);
  }));
  
  // Metrics endpoint (basic)
  app.get('/metrics', (req, res) => {
    const memoryUsage = process.memoryUsage();
    res.json({
      uptime: process.uptime(),
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      },
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    });
  });
  
  console.log('Security middleware configured');
};

module.exports = {
  errorMiddleware,
  validateRequest,
  performanceMiddleware,
  createRateLimiter,
  securityHeadersMiddleware,
  requestLoggingMiddleware,
  setupHealthChecks,
  asyncHandler,
  sanitizeInput,
  sanitizationMiddleware,
  setupMiddleware
};
