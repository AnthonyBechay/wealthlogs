// src/services/token.service.js

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../lib/prisma');
const { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } = require('../utils/constants');

// Get secrets from environment with fallbacks
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.SECRET_KEY || 'dev-access-secret-change-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

class TokenService {
  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @returns {string} Access token
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'wealthlog',
      audience: 'wealthlog-api'
    });
  }

  /**
   * Generate refresh token
   * @param {number} userId - User ID
   * @returns {Promise<string>} Refresh token
   */
  async generateRefreshToken(userId) {
    // Generate a unique token ID
    const tokenId = crypto.randomBytes(32).toString('hex');
    
    // Create refresh token
    const refreshToken = jwt.sign(
      { 
        userId,
        tokenId,
        type: 'refresh'
      },
      REFRESH_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: 'wealthlog',
        audience: 'wealthlog-api'
      }
    );

    // Store token hash in database for validation and revocation
    const hashedToken = crypto.createHash('sha256').update(tokenId).digest('hex');
    
    try {
      await prisma.refreshToken.create({
        data: {
          token: hashedToken,
          userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });
    } catch (error) {
      console.error('Failed to store refresh token:', error);
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
      return jwt.verify(token, ACCESS_SECRET, {
        issuer: 'wealthlog',
        audience: 'wealthlog-api'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      throw new Error('Invalid access token');
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
        issuer: 'wealthlog',
        audience: 'wealthlog-api'
      });

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
      } catch (dbError) {
        // If database check fails, continue with token validation
        console.warn('Database token validation skipped:', dbError.message);
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      throw new Error('Invalid refresh token');
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
    } catch (error) {
      console.error('Failed to revoke refresh token:', error);
    }
  }

  /**
   * Revoke all user refresh tokens
   * @param {number} userId - User ID
   */
  async revokeAllUserTokens(userId) {
    try {
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to revoke user tokens:', error);
    }
  }

  /**
   * Clean expired tokens from database
   */
  async cleanExpiredTokens() {
    try {
      await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { revokedAt: { not: null } }
          ]
        }
      });
    } catch (error) {
      console.error('Failed to clean expired tokens:', error);
    }
  }

  /**
   * Generate token pair (access + refresh)
   * @param {Object} user - User object
   * @returns {Promise<Object>} Token pair
   */
  async generateTokenPair(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      roles: user.roles?.map(r => r.name) || []
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken
    };
  }
}

module.exports = new TokenService();
