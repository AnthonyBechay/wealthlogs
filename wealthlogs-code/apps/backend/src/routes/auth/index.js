// src/routes/auth/index.js

const express = require('express');
const router = express.Router();
const authService = require('../../services/auth.service');
const tokenService = require('../../services/token.service');
const { authenticate } = require('../../middleware/auth.middleware');
const passport = require('../../middleware/passport.config');
const { COOKIE_OPTIONS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../utils/constants');

// ============= LOCAL AUTH ROUTES =============

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message === ERROR_MESSAGES.EMAIL_IN_USE) {
      return res.status(409).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Login with username/email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    const result = await authService.login(username, password);
    
    // Set refresh token as httpOnly cookie
    res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);
    
    // Return access token and user info
    res.json({
      accessToken: result.accessToken,
      user: result.user,
      message: SUCCESS_MESSAGES.LOGIN
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error.message === ERROR_MESSAGES.INVALID_CREDENTIALS || 
        error.message === ERROR_MESSAGES.EMAIL_NOT_VERIFIED) {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Logout and revoke tokens
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    await authService.logout(req.user.userId, refreshToken);
    
    // Clear cookies
    res.clearCookie('refresh_token');
    res.clearCookie('access_token');
    
    res.json({ message: SUCCESS_MESSAGES.LOGOUT });
  } catch (error) {
    console.error('Logout error:', error);
    // Always return success for logout
    res.json({ message: SUCCESS_MESSAGES.LOGOUT });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        error: ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
        code: 'NO_REFRESH_TOKEN'
      });
    }

    const result = await authService.refreshToken(refreshToken);
    
    // Set new refresh token as cookie
    res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);
    
    // Return new access token
    res.json({
      accessToken: result.accessToken,
      user: result.user
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ 
      error: ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(404).json({ error: ERROR_MESSAGES.USER_NOT_FOUND });
  }
});

// ============= EMAIL VERIFICATION =============

/**
 * GET /api/auth/verify-email
 * Verify email with token
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const result = await authService.verifyEmail(token);
    res.json(result);
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // TODO: Implement resend verification in auth service
    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// ============= PASSWORD RESET =============

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    // Always return success for security
    res.json({ message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ 
        error: 'Token and password are required' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters' 
      });
    }

    const result = await authService.resetPassword(token, password);
    res.json(result);
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============= GOOGLE OAUTH =============

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const result = req.user;
      
      // Set refresh token as cookie
      res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);
      
      // Redirect to frontend with access token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}`);
    } catch (error) {
      console.error('Google callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }
);

module.exports = router;
