// src/services/token.service.js

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../lib/prisma');
const logger = require('../lib/logger');
const { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } = require('../utils/constants');

// Get secrets from environment with fallbacks
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.SECRET_KEY || 'dev-access-secret-change-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

// Token configuration
const TOKEN_CONFIG = {
  issuer: 'wealthlog',
  audience: 'wealthlog-api',
  algorithm: 'HS256'
};

class TokenService {
  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @returns {string} Access token
   */
  generateAccessToken(payload) {
    // Clean payload - only include necessary data
    const cleanPayload = {
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles || [],
      type: 'access'
    };

    return jwt.sign(cleanPayload, ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: TOKEN_CONFIG.issuer,
      audience: TOKEN_CONFIG.audience,
      algorithm: TOKEN_CONFIG.algorithm
    });
  }

  /**
   * Generate refresh token
   * @param {number} userId - User ID
   * @param {string} deviceId - Optional device identifier
   * @returns {Promise<string>} Refresh token
   */
  async generateRefreshToken(userId, deviceId = null) {
    // Generate a unique token ID
    const tokenId = crypto.randomBytes(32).toString('hex');
    
    // Create refresh token with minimal payload
    const refreshToken = jwt.sign(
      { 
        userId,
        tokenId,
        type: 'refresh',
        deviceId
      },
      REFRESH_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: TOKEN_CONFIG.issuer,
        audience: TOKEN_CONFIG.audience,
        algorithm: TOKEN_CONFIG.algorithm
      }
    );

    // Store token hash in database for validation and revocation
    const hashedToken = crypto.createHash('sha256').update(tokenId).digest('hex');
    
    try {
      // Clean up old tokens for this user (keep last 5)
      const existingTokens = await prisma.refreshToken.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: 4 // Keep last 4, will add 1 new = 5 total
      });

      if (existingTokens.length > 0) {
        await prisma.refreshToken.deleteMany({
          where: {
            userId,
            id: { in: existingTokens.map(t => t.id) }
          }
        });
      }

      // Create new token record
      await prisma.refreshToken.create({
        data: {
          token: hashedToken,
          userId,
          deviceId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          lastUsedAt: new Date()
        }
      });

      logger.info('Refresh token generated', {
        userId,
        deviceId,
        tokenId: tokenId.substring(0, 8) + '...' // Log partial for security
      });
    } catch (error) {
      logger.error('Failed to store refresh token:', error);
      // Continue even if database storage fails
    }

    return refreshToken;
  }

  /**
   * Verify access token
   * @param {string} token - Access token
   * @returns {Object} Decoded token
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, ACCESS_SECRET, {
        issuer: TOKEN_CONFIG.issuer,
        audience: TOKEN_CONFIG.audience,
        algorithms: [TOKEN_CONFIG.algorithm]
      });

      // Ensure it's an access token
      if (decoded.type && decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - Refresh token
   * @returns {Promise<Object>} Decoded token
   */
  async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, REFRESH_SECRET, {
        issuer: TOKEN_CONFIG.issuer,
        audience: TOKEN_CONFIG.audience,
        algorithms: [TOKEN_CONFIG.algorithm]
      });

      // Ensure it's a refresh token
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if token exists in database and is not revoked
      const hashedToken = crypto.createHash('sha256').update(decoded.tokenId).digest('hex');
      
      try {
        const storedToken = await prisma.refreshToken.findFirst({
          where: {
            token: hashedToken,
            userId: decoded.userId,
            revokedAt: null,
            expiresAt: {
              gt: new Date()
            }
          }
        });

        if (!storedToken) {
          throw new Error('Refresh token not found or revoked');
        }

        // Update last used timestamp
        await prisma.refreshToken.update({
          where: { id: storedToken.id },
          data: { lastUsedAt: new Date() }
        });
      } catch (dbError) {
        // If database check fails, log but continue
        logger.warn('Database token validation failed:', dbError.message);
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Revoke refresh token
   * @param {string} tokenId - Token ID
   * @param {number} userId - User ID
   */
  async revokeRefreshToken(tokenId, userId) {
    try {
      const hashedToken = crypto.createHash('sha256').update(tokenId).digest('hex');
      
      await prisma.refreshToken.updateMany({
        where: {
          token: hashedToken,
          userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });

      logger.info('Refresh token revoked', {
        userId,
        tokenId: tokenId.substring(0, 8) + '...'
      });
    } catch (error) {
      logger.error('Failed to revoke refresh token:', error);
    }
  }

  /**
   * Revoke all user refresh tokens
   * @param {number} userId - User ID
   */
  async revokeAllUserTokens(userId) {
    try {
      const result = await prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });

      logger.info('All user tokens revoked', {
        userId,
        count: result.count
      });
    } catch (error) {
      logger.error('Failed to revoke user tokens:', error);
    }
  }

  /**
   * Clean expired tokens from database
   */
  async cleanExpiredTokens() {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { 
              revokedAt: { 
                not: null,
                lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Revoked more than 24h ago
              }
            }
          ]
        }
      });

      if (result.count > 0) {
        logger.info('Expired tokens cleaned', { count: result.count });
      }
    } catch (error) {
      logger.error('Failed to clean expired tokens:', error);
    }
  }

  /**
   * Generate token pair (access + refresh)
   * @param {Object} user - User object
   * @param {string} deviceId - Optional device identifier
   * @returns {Promise<Object>} Token pair
   */
  async generateTokenPair(user, deviceId = null) {
    const payload = {
      userId: user.id,
      email: user.email,
      roles: user.roles?.map(r => r.name) || []
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(user.id, deviceId);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  }

  /**
   * Rotate refresh token (generate new pair from old refresh token)
   * @param {string} oldRefreshToken - Current refresh token
   * @returns {Promise<Object>} New token pair
   */
  async rotateRefreshToken(oldRefreshToken) {
    const decoded = await this.verifyRefreshToken(oldRefreshToken);
    
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { roles: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Revoke old token
    await this.revokeRefreshToken(decoded.tokenId, decoded.userId);

    // Generate new pair
    return this.generateTokenPair(user, decoded.deviceId);
  }

  /**
   * Validate token without throwing errors
   * @param {string} token - Token to validate
   * @param {string} type - 'access' or 'refresh'
   * @returns {Object} { valid: boolean, decoded?: Object, error?: string }
   */
  validateToken(token, type = 'access') {
    try {
      const secret = type === 'refresh' ? REFRESH_SECRET : ACCESS_SECRET;
      const decoded = jwt.verify(token, secret, {
        issuer: TOKEN_CONFIG.issuer,
        audience: TOKEN_CONFIG.audience,
        algorithms: [TOKEN_CONFIG.algorithm]
      });

      return { valid: true, decoded };
    } catch (error) {
      return { 
        valid: false, 
        error: error.message 
      };
    }
  }
}

// Create singleton instance
const tokenService = new TokenService();

// Schedule token cleanup every hour
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    tokenService.cleanExpiredTokens().catch(err => {
      logger.error('Token cleanup failed:', err);
    });
  }, 60 * 60 * 1000); // 1 hour
}

module.exports = tokenService;
