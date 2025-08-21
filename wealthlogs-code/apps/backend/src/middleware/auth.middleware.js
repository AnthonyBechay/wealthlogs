// src/middleware/auth.middleware.js

const tokenService = require('../services/token.service');
const { ERROR_MESSAGES } = require('../utils/constants');

/**
 * Main authentication middleware
 * Expects Bearer token in Authorization header or access_token in cookies
 */
function authenticate(req, res, next) {
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

    if (!token) {
      return res.status(401).json({ 
        error: ERROR_MESSAGES.UNAUTHORIZED,
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    try {
      const decoded = tokenService.verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.message.includes('expired')) {
        return res.status(401).json({ 
          error: ERROR_MESSAGES.TOKEN_EXPIRED,
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({ 
        error: ERROR_MESSAGES.TOKEN_INVALID,
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
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
    console.error('Optional auth middleware error:', error);
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
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRoles
};
