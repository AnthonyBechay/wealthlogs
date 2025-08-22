# Quick Reference: Environment Variables for Render

## CRITICAL FIX NEEDED

The authentication was failing because the old middleware was using `SECRET_KEY` while the new auth system uses `JWT_ACCESS_SECRET`.

### Required Environment Variables on Render:

```
NODE_ENV=production
DATABASE_URL=your-postgresql-connection-string

# IMPORTANT: Set BOTH of these to the SAME value
JWT_ACCESS_SECRET=your-secure-32-character-secret-here
SECRET_KEY=your-secure-32-character-secret-here

JWT_REFRESH_SECRET=another-secure-32-character-secret
SESSION_SECRET=another-secure-32-character-secret

ALLOWED_ORIGINS=https://wealthlogs.com,https://www.wealthlogs.com
FRONTEND_URL=https://wealthlogs.com
```

### To Generate Secure Secrets:
```bash
openssl rand -hex 32
```

### What Was Fixed:
1. ✅ Dashboard route now uses correct auth middleware
2. ✅ Community route now uses correct auth middleware  
3. ✅ Coaching route now uses correct auth middleware
4. ✅ Old authenticate.js now uses JWT_ACCESS_SECRET as fallback

### Testing After Fix:
```bash
# Test production auth
./maintain.sh auth:test prod

# Or test with curl
curl https://wealthlog-backend-hx43.onrender.com/api/auth/debug
```
