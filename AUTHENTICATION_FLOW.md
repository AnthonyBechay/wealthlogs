# WealthLog Authentication Flow Documentation

## Overview
This document explains the complete authentication flow for WealthLog and how to resolve the 404 error when accessing `/dashboard/networth/summary`.

## Issue Summary
The 404 error occurs because:
1. The frontend was missing the `/dashboard` route pages
2. There was a mismatch in the authentication response format between backend and frontend
3. The landing page was using direct fetch instead of the API client

## Authentication Flow

### 1. Login Process
- User enters credentials on `/login` page
- Frontend calls `authService.login()` which sends POST to `/api/auth/login`
- Backend validates credentials and returns:
  ```json
  {
    "accessToken": "jwt-token",
    "user": {
      "id": 1,
      "username": "user",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["MEMBER"],
      "emailVerified": true
    }
  }
  ```
- Token is stored in localStorage and set in Authorization header
- User is redirected to `/landing/landing` (the dashboard)

### 2. Protected Routes
- All routes except public ones require authentication
- The `_app.tsx` component wraps the app with `AuthProvider`
- Protected routes check for authentication and redirect to login if needed
- Authentication middleware on backend validates JWT tokens

### 3. Token Management
- Access tokens are stored in localStorage
- Tokens are automatically included in API requests via interceptors
- Token refresh is handled automatically when tokens expire
- On logout, tokens are cleared and user is redirected to login

## Fixes Applied

### 1. Backend Fixes (`apps/backend/src/routes/auth.js`)
- Changed login response from `token` to `accessToken` to match frontend expectations
- Fixed `/api/auth/me` endpoint to properly return user data with authentication
- Added proper authentication middleware to the `/me` endpoint

### 2. Frontend Fixes

#### Created Missing Dashboard Routes
- `pages/dashboard/index.tsx` - Redirects to landing page
- `pages/dashboard/networth/summary.tsx` - Redirects to landing page

#### Fixed Landing Page Data Fetching (`pages/landing/landing.tsx`)
- Changed from direct fetch calls to using the API client methods
- Now uses `api.getDashboard()` and `api.getDashboardSummary()`

### 3. API Client (`packages/shared/src/api/index.ts`)
- Ensures all API calls have the `/api` prefix
- Handles authentication headers automatically
- Manages token refresh and error handling

## Environment Configuration

### Development (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### Production
For production deployment (e.g., on Vercel), set these environment variables:
```
NEXT_PUBLIC_API_URL=https://your-backend-api.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

## Deployment Steps

### 1. Backend Deployment
1. Ensure all environment variables are set
2. Run database migrations: `npx prisma migrate deploy`
3. Start the server: `npm start`

### 2. Frontend Deployment
1. Set environment variables in Vercel/hosting platform
2. Build the application: `npm run build`
3. Deploy using: `vercel --prod` or your hosting platform's deployment method

## Testing the Fix

1. **Rebuild the application:**
   ```bash
   cd apps/web
   npm run build
   npm run start
   ```

2. **Test authentication flow:**
   - Navigate to `/login`
   - Enter valid credentials
   - Should redirect to `/landing/landing`
   - Dashboard should load with net worth data

3. **Verify API calls:**
   - Open browser DevTools Network tab
   - Check that API calls go to `http://localhost:5000/api/*`
   - Verify Authorization header is present
   - Confirm responses are successful (200 status)

## Common Issues and Solutions

### Issue: Still getting 404 on dashboard
**Solution:** Ensure you've rebuilt the Next.js application after creating the new pages.

### Issue: Authentication fails with "Not authenticated"
**Solution:** Check that:
- Backend is running on port 5000
- CORS is configured correctly in backend
- Token is being sent in Authorization header

### Issue: Data not loading on dashboard
**Solution:** Verify:
- Backend database has data for the user
- Redis is running (if caching is enabled)
- API endpoints return data when tested directly

### Issue: Login succeeds but immediately redirects back to login
**Solution:** Check:
- Token is being stored in localStorage
- `/api/auth/me` endpoint returns user data
- Email verification status (user must be verified)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/verify-email` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Dashboard
- `GET /api/dashboard/networth` - Get net worth time series data
- `GET /api/dashboard/networth/summary` - Get net worth summary

## Security Considerations

1. **JWT Tokens:**
   - Tokens expire after 1 hour
   - Refresh tokens should be implemented for better UX
   - Store tokens securely (httpOnly cookies recommended for production)

2. **Email Verification:**
   - Users must verify email before login
   - Verification tokens expire after 24 hours

3. **Password Security:**
   - Passwords are hashed with bcrypt (10 rounds)
   - Password reset tokens expire after 1 hour

4. **CORS:**
   - Configure allowed origins properly for production
   - Currently allows localhost:3000 and localhost:3003

## Next Steps

1. **Implement refresh token rotation** for better security
2. **Add rate limiting** on authentication endpoints
3. **Implement 2FA** for enhanced security
4. **Add session management** UI for users
5. **Implement remember me** functionality
6. **Add OAuth providers** (Google OAuth is partially implemented)

## Support

For issues or questions:
1. Check the browser console for errors
2. Review the backend logs for API errors
3. Ensure all services are running (backend, database, Redis)
4. Verify environment variables are set correctly
