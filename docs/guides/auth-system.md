# WealthLog Authentication System Documentation

## Overview

The WealthLog authentication system has been completely modernized with enterprise-grade security features, consistent error handling, and enhanced monitoring capabilities.

## Architecture

### Core Components

1. **Token Service** (`src/services/token.service.js`)
   - JWT token generation and validation
   - Access tokens (15 minutes) + Refresh tokens (7 days)
   - Automatic token rotation
   - Token cleanup scheduler

2. **Auth Middleware** (`src/middleware/auth.middleware.js`)
   - Bearer token authentication
   - Cookie fallback support
   - Role-based access control
   - Rate limiting
   - Account ownership verification

3. **Auth Routes** (`src/routes/auth/index.js`)
   - User registration and login
   - Token refresh
   - Password reset
   - Email verification
   - Google OAuth integration

## Authentication Flow

```
1. User Login
   POST /api/auth/login
   ↓
2. Validate Credentials
   ↓
3. Generate Token Pair
   - Access Token (15 min)
   - Refresh Token (7 days)
   ↓
4. Return Tokens
   - Access token in response body
   - Refresh token in httpOnly cookie
   ↓
5. Client Requests
   - Send access token in Authorization header
   - Backend validates token on each request
   ↓
6. Token Refresh (when access token expires)
   POST /api/auth/refresh
   - Uses refresh token from cookie
   - Returns new access token
```

## API Endpoints

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/verify-email` | Verify email address |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |

### Protected Endpoints (Auth Required)

All routes under `/api/*` (except `/api/auth/*`) require authentication:

- `/api/dashboard/*` - Dashboard data
- `/api/account/*` - Account management
- `/api/transactions/*` - Transaction operations
- `/api/trade/*` - Trading operations
- `/api/tradingSettings/*` - Trading settings
- `/api/generalSettings/*` - General settings
- `/api/community/*` - Community features
- `/api/coaching/*` - Coaching features
- `/api/admin/*` - Admin operations (requires ADMIN role)

## Using the Middleware

### Basic Authentication

```javascript
const { authenticate } = require('./middleware/auth.middleware');

// Protect a route
router.get('/protected', authenticate, (req, res) => {
  // req.user contains:
  // - userId: number
  // - email: string
  // - roles: string[]
  res.json({ userId: req.user.userId });
});
```

### Role-Based Access Control

```javascript
const { authenticate, requireRoles } = require('./middleware/auth.middleware');

// Admin only route
router.get('/admin', authenticate, requireRoles('ADMIN'), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

// Multiple roles
router.get('/moderator', authenticate, requireRoles('ADMIN', 'MODERATOR'), (req, res) => {
  res.json({ message: 'Moderator access granted' });
});
```

### Rate Limiting

```javascript
const { authenticate, rateLimit } = require('./middleware/auth.middleware');

// Limit to 5 attempts per 15 minutes
router.post('/sensitive', 
  authenticate, 
  rateLimit(5, 15 * 60 * 1000), 
  (req, res) => {
    res.json({ message: 'Rate limited endpoint' });
  }
);
```

### Account Ownership Verification

```javascript
const { authenticate, verifyAccountOwnership } = require('./middleware/auth.middleware');

// Automatically verify account ownership
router.put('/account/:accountId', 
  authenticate, 
  verifyAccountOwnership, 
  (req, res) => {
    // req.account contains verified account info
    res.json({ accountId: req.account.id });
  }
);
```

### Optional Authentication

```javascript
const { optionalAuth } = require('./middleware/auth.middleware');

// Public route with optional auth
router.get('/public', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({ message: `Hello ${req.user.email}` });
  } else {
    res.json({ message: 'Hello guest' });
  }
});
```

## Environment Variables

### Required

```env
# JWT Secrets (use openssl rand -hex 32 to generate)
JWT_ACCESS_SECRET=your-32-character-secret
JWT_REFRESH_SECRET=your-32-character-secret

# For backward compatibility (set same as JWT_ACCESS_SECRET)
SECRET_KEY=your-32-character-secret

# Session secret for OAuth
SESSION_SECRET=your-32-character-secret

# Frontend URL for CORS
FRONTEND_URL=https://wealthlogs.com
ALLOWED_ORIGINS=https://wealthlogs.com,https://www.wealthlogs.com
```

### Optional

```env
# Enhanced Security
VERIFY_USER_ACTIVE=true  # Check if user is active on each request
REQUIRE_EMAIL_VERIFICATION=true  # Require email verification

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-backend/api/auth/google/callback

# Logging
LOG_LEVEL=info  # debug, info, warn, error

# Cookie Domain (for subdomains)
COOKIE_DOMAIN=.wealthlogs.com
```

## Security Features

### 1. Token Security
- Short-lived access tokens (15 minutes)
- Refresh tokens stored as hashed values in database
- Automatic token rotation on refresh
- Token cleanup scheduler for expired tokens
- Device tracking support

### 2. Request Security
- CORS configuration with credentials support
- httpOnly cookies for refresh tokens
- Secure flag on cookies in production
- SameSite=none for cross-domain support
- Rate limiting on sensitive endpoints

### 3. Monitoring & Logging
- Comprehensive logging of auth events
- Failed authentication attempts tracking
- Token usage monitoring
- Rate limit violations logging

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `NO_TOKEN` | No authentication token provided | 401 |
| `TOKEN_EXPIRED` | Access token has expired | 401 |
| `INVALID_TOKEN` | Token validation failed | 401 |
| `USER_INACTIVE` | User account is inactive | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `ACCOUNT_NOT_FOUND` | Account doesn't exist | 404 |
| `ACCOUNT_FORBIDDEN` | Not authorized for account | 403 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |

## Client Integration

### JavaScript/TypeScript

```typescript
class AuthService {
  private accessToken: string | null = null;

  async login(username: string, password: string) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    this.accessToken = data.accessToken;
    return data;
  }

  async makeAuthenticatedRequest(url: string, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`
      },
      credentials: 'include'
    });

    if (response.status === 401) {
      // Try to refresh token
      await this.refreshToken();
      // Retry request
      return this.makeAuthenticatedRequest(url, options);
    }

    return response;
  }

  async refreshToken() {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
    
    const data = await response.json();
    this.accessToken = data.accessToken;
    return data;
  }
}
```

## Testing

### Test Authentication

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "testuser",
    "password": "SecurePass123!"
  }'

# Access protected route
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt
```

### Using the Maintenance Script

```bash
# Test local authentication
./maintain.sh auth:test

# Test production authentication
./maintain.sh auth:test prod
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if token is being sent in Authorization header
   - Verify token hasn't expired (15 min for access token)
   - Check if refresh token cookie is being sent

2. **CORS Errors**
   - Ensure `ALLOWED_ORIGINS` includes your frontend URL
   - Check `credentials: true` in CORS config
   - Verify `withCredentials: true` in client requests

3. **Token Expired**
   - Implement automatic token refresh in client
   - Check if refresh token is valid (7 days)
   - Ensure cookies are enabled

4. **Rate Limit Exceeded**
   - Wait for the time specified in `retryAfter`
   - Implement exponential backoff in client
   - Check for infinite loops in retry logic

## Best Practices

1. **Never store tokens in localStorage** - Use memory for access tokens
2. **Always use HTTPS in production** - Required for secure cookies
3. **Implement token refresh** - Handle expiry gracefully
4. **Add request interceptors** - Centralize auth logic
5. **Log auth events** - Monitor for suspicious activity
6. **Use rate limiting** - Protect sensitive endpoints
7. **Validate account ownership** - Prevent unauthorized access
8. **Keep tokens short-lived** - Minimize exposure window
9. **Rotate secrets regularly** - Update JWT secrets periodically
10. **Monitor failed attempts** - Detect potential attacks

## Migration from Old System

If you had users in the old system:

1. Passwords are already hashed with bcrypt (compatible)
2. Old sessions will be invalid (users need to login again)
3. No data migration needed - same user table structure
4. Update any hardcoded references to old endpoints

## Support

For issues or questions:
1. Check logs: `./maintain.sh logs backend`
2. Test auth flow: `./maintain.sh auth:test`
3. Verify environment variables are set correctly
4. Check browser DevTools for client-side errors
5. Review this documentation for proper integration
