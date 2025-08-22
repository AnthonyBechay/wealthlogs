// src/middleware/auth.middleware.js

const tokenService = require('../services/token.service');
const { ERROR_MESSAGES } = require('../utils/constants');
const { prisma } = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Main authentication middleware
 * Expects Bearer token in Authorization header or access_token in cookies
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fallback to cookie if no header token
    if (!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    // Log for debugging in production (limited)
    if (!token && process.env.NODE_ENV === 'production') {
      logger.warn('Auth: No token provided', {
        hasAuthHeader: !!authHeader,
        hasCookies: !!req.cookies,
        origin: req.headers.origin,
        path: req.path
      });
    }

    if (!token) {
      return res.status(401).json({ 
        error: ERROR_MESSAGES.UNAUTHORIZED,
        code: 'NO_TOKEN',
        debug: process.env.NODE_ENV !== 'production' ? {
          hasAuthHeader: !!authHeader,
          hasCookies: !!req.cookies,
          cookieNames: req.cookies ? Object.keys(req.cookies) : []
        } : undefined
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = tokenService.verifyAccessToken(token);
    } catch (error) {
      if (error.message.includes('expired')) {
        return res.status(401).json({ 
          error: ERROR_MESSAGES.TOKEN_EXPIRED,
          code: 'TOKEN_EXPIRED'
        });
      }
      logger.warn('Invalid token attempt', {
        error: error.message,
        path: req.path
      });
      return res.status(401).json({ 
        error: ERROR_MESSAGES.TOKEN_INVALID,
        code: 'INVALID_TOKEN',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Optionally verify user still exists and is active
    if (process.env.VERIFY_USER_ACTIVE === 'true') {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, active: true, roles: true }
      });

      if (!user || user.active === false) {
        logger.warn('Inactive or deleted user attempted access', {
          userId: decoded.userId,
          path: req.path
        });
        return res.status(401).json({
          error: 'User account inactive or not found',
          code: 'USER_INACTIVE'
        });
      }

      // Attach full user info to request
      req.user = {
        ...decoded,
        active: user.active,
        roles: user.roles?.map(r => r.name) || decoded.roles || []
      };
    } else {
      // Use decoded token data
      req.user = decoded;
    }

    // Log successful auth for monitoring (limited in production)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Auth successful', {
        userId: req.user.userId,
        path: req.path,
        method: req.method
      });
    }

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Optional authentication middleware
 * Sets req.user if valid token exists, but doesn't block request
 */
function optionalAuth(req, res, next) {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fallback to cookie
    if (!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (token) {
      try {
        const decoded = tokenService.verifyAccessToken(token);
        req.user = decoded;
      } catch (error) {
        // Token is invalid but we don't block the request
        req.user = null;
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
}

/**
 * Role-based access control middleware
 * @param {string[]} allowedRoles - Array of allowed role names
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: ERROR_MESSAGES.UNAUTHORIZED,
        code: 'NO_USER'
      });
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.userId,
        requiredRoles: allowedRoles,
        userRoles: userRoles,
        path: req.path
      });
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: process.env.NODE_ENV === 'development' ? allowedRoles : undefined
      });
    }

    next();
  };
}

/**
 * Rate limiting middleware for sensitive operations
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 */
function rateLimit(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const attempts = new Map();

  return (req, res, next) => {
    const key = `${req.user?.userId || req.ip}:${req.path}`;
    const now = Date.now();
    
    // Clean old entries
    for (const [k, v] of attempts.entries()) {
      if (now - v.firstAttempt > windowMs) {
        attempts.delete(k);
      }
    }

    const record = attempts.get(key);
    if (!record) {
      attempts.set(key, { count: 1, firstAttempt: now });
      return next();
    }

    if (now - record.firstAttempt > windowMs) {
      // Reset window
      attempts.set(key, { count: 1, firstAttempt: now });
      return next();
    }

    record.count++;
    if (record.count > maxAttempts) {
      logger.warn('Rate limit exceeded', {
        key,
        attempts: record.count,
        path: req.path
      });
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((record.firstAttempt + windowMs - now) / 1000)
      });
    }

    next();
  };
}

/**
 * Verify account ownership middleware
 * Checks if the user owns the account specified in params or body
 */
async function verifyAccountOwnership(req, res, next) {
  try {
    const accountId = req.params.accountId || req.body.accountId || req.query.accountId;
    
    if (!accountId) {
      return next(); // No account specified, continue
    }

    const account = await prisma.financialAccount.findUnique({
      where: { id: parseInt(accountId) },
      select: { userId: true }
    });

    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    if (account.userId !== req.user.userId) {
      logger.warn('Unauthorized account access attempt', {
        userId: req.user.userId,
        accountId: accountId,
        path: req.path
      });
      return res.status(403).json({
        error: 'Not authorized for this account',
        code: 'ACCOUNT_FORBIDDEN'
      });
    }

    // Attach account to request for convenience
    req.account = { id: parseInt(accountId), userId: account.userId };
    next();
  } catch (error) {
    logger.error('Account ownership verification error:', error);
    return res.status(500).json({
      error: 'Failed to verify account ownership',
      code: 'VERIFICATION_ERROR'
    });
  }
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRoles,
  rateLimit,
  verifyAccountOwnership
};
