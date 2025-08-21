// src/services/auth.service.js

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { prisma } = require('../lib/prisma');
const tokenService = require('./token.service');
const emailService = require('./emailservice');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../utils/constants');

class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      securityQuestion,
      securityAnswer,
      roleName = 'MEMBER'
    } = userData;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username }
        ]
      }
    });

    if (existingUser) {
      throw new Error(ERROR_MESSAGES.EMAIL_IN_USE);
    }

    // Get or create role
    let role = await prisma.role.findUnique({
      where: { name: roleName }
    });
    
    if (!role) {
      role = await prisma.role.create({ 
        data: { name: roleName } 
      });
    }

    // Parse date of birth
    let dob = null;
    if (dateOfBirth) {
      dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        throw new Error('Invalid date of birth format');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        dateOfBirth: dob,
        securityQuestion,
        securityAnswer,
        roles: { connect: { id: role.id } },
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires
      },
      include: { roles: true }
    });

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        newUser.email,
        newUser.username || newUser.firstName,
        emailVerificationToken
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    return {
      message: SUCCESS_MESSAGES.REGISTER,
      userId: newUser.id,
      email: newUser.email
    };
  }

  /**
   * Login with email and password
   */
  async login(username, password) {
    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username.toLowerCase() }
        ]
      },
      include: { roles: true }
    });

    if (!user) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Check email verification (optional - can be removed if you want users to login without verification)
    if (!user.emailVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      throw new Error(ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate tokens
    const tokens = await tokenService.generateTokenPair(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map(r => r.name),
        emailVerified: user.emailVerified
      }
    };
  }

  /**
   * Login with Google OAuth
   */
  async loginWithGoogle(profile) {
    const email = profile.emails[0].value.toLowerCase();
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
      include: { roles: true }
    });

    if (!user) {
      // Get default role
      let role = await prisma.role.findUnique({
        where: { name: 'MEMBER' }
      });
      
      if (!role) {
        role = await prisma.role.create({ 
          data: { name: 'MEMBER' } 
        });
      }

      // Create new user from Google profile
      user = await prisma.user.create({
        data: {
          email,
          username: email.split('@')[0] + '_' + Date.now(),
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          googleId: profile.id,
          emailVerified: true,
          password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10), // Random password
          roles: { connect: { id: role.id } }
        },
        include: { roles: true }
      });

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(
          user.email,
          user.firstName || user.username
        );
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    } else {
      // Update Google ID if not set
      if (!user.googleId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            googleId: profile.id,
            emailVerified: true
          }
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
    }

    // Generate tokens
    const tokens = await tokenService.generateTokenPair(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map(r => r.name),
        emailVerified: user.emailVerified
      }
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    // Verify refresh token
    const decoded = await tokenService.verifyRefreshToken(refreshToken);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { roles: true }
    });

    if (!user) {
      throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Generate new token pair (rotating refresh token)
    const tokens = await tokenService.generateTokenPair(user);

    // Revoke old refresh token
    await tokenService.revokeRefreshToken(decoded.tokenId, user.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map(r => r.name)
      }
    };
  }

  /**
   * Logout user
   */
  async logout(userId, refreshToken) {
    try {
      if (refreshToken) {
        const decoded = tokenService.verifyRefreshToken(refreshToken);
        await tokenService.revokeRefreshToken(decoded.tokenId, userId);
      } else {
        // Revoke all tokens if no specific token provided
        await tokenService.revokeAllUserTokens(userId);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    return { message: SUCCESS_MESSAGES.LOGOUT };
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });

    if (!user) {
      throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      roles: user.roles.map(r => r.name),
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() }
      }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(
        user.email,
        user.username || user.firstName
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    return { message: SUCCESS_MESSAGES.EMAIL_VERIFIED };
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        user.username || user.firstName,
        resetToken
      );
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    return { message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT };
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    // Revoke all refresh tokens for security
    await tokenService.revokeAllUserTokens(user.id);

    // Send password changed notification
    try {
      await emailService.sendPasswordChangedEmail(
        user.email,
        user.username || user.firstName
      );
    } catch (emailError) {
      console.error('Failed to send password changed email:', emailError);
    }

    return { message: SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS };
  }
}

module.exports = new AuthService();
