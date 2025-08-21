// src/utils/constants.js

module.exports = {
  // Token expiry times
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  EMAIL_VERIFICATION_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours in ms
  PASSWORD_RESET_EXPIRY: 60 * 60 * 1000, // 1 hour in ms

  // Cookie settings
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  },

  // Rate limiting
  RATE_LIMITS: {
    LOGIN: { windowMs: 15 * 60 * 1000, max: 5 },
    REGISTER: { windowMs: 60 * 60 * 1000, max: 10 },
    REFRESH: { windowMs: 60 * 1000, max: 10 },
    PASSWORD_RESET: { windowMs: 60 * 60 * 1000, max: 3 }
  },

  // Error messages
  ERROR_MESSAGES: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_NOT_VERIFIED: 'Please verify your email before logging in',
    TOKEN_EXPIRED: 'Token has expired',
    TOKEN_INVALID: 'Invalid token',
    REFRESH_TOKEN_INVALID: 'Invalid refresh token',
    USER_NOT_FOUND: 'User not found',
    EMAIL_IN_USE: 'Email already in use',
    UNAUTHORIZED: 'Unauthorized access',
    SESSION_EXPIRED: 'Session has expired, please login again',
    GOOGLE_AUTH_FAILED: 'Google authentication failed'
  },

  // Success messages
  SUCCESS_MESSAGES: {
    LOGIN: 'Successfully logged in',
    LOGOUT: 'Successfully logged out',
    REGISTER: 'Registration successful. Please check your email to verify your account',
    EMAIL_VERIFIED: 'Email verified successfully',
    PASSWORD_RESET_SENT: 'Password reset email sent',
    PASSWORD_RESET_SUCCESS: 'Password reset successful'
  }
};
