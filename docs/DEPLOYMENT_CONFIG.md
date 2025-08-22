# WealthLog Deployment Configuration

## Project Structure for Deployment

The project uses a monorepo structure with Turborepo. The deployment services expect files in specific locations:

```
wealthlogs/                    # Git repository root
├── wealthlogs-code/          # Application root (deployment root)
│   ├── turbo.json           # REQUIRED for Turborepo
│   ├── vercel.json          # REQUIRED for Vercel
│   ├── package.json         # REQUIRED - Workspace root
│   ├── apps/
│   │   ├── backend/         # Express.js backend
│   │   └── web/            # Next.js frontend
│   └── packages/
│       └── shared/         # Shared utilities
├── scripts/                 # Maintenance scripts (local use)
├── docs/                   # Documentation
└── README.md              # Project documentation
```

## Vercel Configuration (Frontend)

### Dashboard Settings

**Root Directory:** `wealthlogs-code`

**Build & Development Settings:**
- **Framework Preset:** Next.js
- **Build Command:** `npm run build:web`
- **Output Directory:** `apps/web/.next`
- **Install Command:** `npm ci --workspaces --include-workspace-root`

### Environment Variables (Vercel Dashboard)
```
NEXT_PUBLIC_API_URL=https://wealthlog-backend-hx43.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### vercel.json Content (wealthlogs-code/vercel.json)
```json
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && npm ci --workspaces --include-workspace-root && cd wealthlogs-code && npx turbo run build --filter=@wealthlog/web...",
  "installCommand": "echo 'Install handled by buildCommand'",
  "outputDirectory": "apps/web/.next"
}
```

## Render Configuration (Backend)

### Dashboard Settings

**Root Directory:** `wealthlogs-code`

**Build Command:**
```bash
npm ci --workspaces --include-workspace-root && npx turbo run build --filter=@wealthlog/backend... && cd apps/backend && npx prisma generate && npx prisma migrate deploy
```

**Start Command:**
```bash
cd apps/backend && node src/index.js
```

### Environment Variables (Render Dashboard)
```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://username:password@host:5432/database?schema=public

# JWT Secrets (use same value for both for compatibility)
JWT_ACCESS_SECRET=your-32-character-secret-here
SECRET_KEY=your-32-character-secret-here
JWT_REFRESH_SECRET=another-32-character-secret-here
SESSION_SECRET=another-32-character-secret-here

# CORS Configuration
ALLOWED_ORIGINS=https://wealthlogs.com,https://www.wealthlogs.com
FRONTEND_URL=https://wealthlogs.com

# Optional
REQUIRE_EMAIL_VERIFICATION=false
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://wealthlog-backend-hx43.onrender.com/api/auth/google/callback
```

## Local Development

### Using the Maintenance Script

The maintenance script works from the repository root:

```bash
# From wealthlogs/ directory
./scripts/maintain.sh dev           # Start all services
./scripts/maintain.sh start backend # Start backend only
./scripts/maintain.sh start frontend # Start frontend only
```

### Manual Commands

If you need to run commands manually from the wealthlogs-code directory:

```bash
cd wealthlogs-code

# Install dependencies
npm ci --workspaces --include-workspace-root

# Start development
npm run dev              # All services
npm run dev:backend     # Backend only
npm run dev:web        # Frontend only

# Build for production
npm run build          # All services
npm run build:web     # Frontend only
npm run build:backend # Backend only
```

## Important Files

### Required in wealthlogs-code/

1. **turbo.json** - Turborepo configuration
2. **vercel.json** - Vercel deployment settings
3. **package.json** - Workspace configuration with scripts

### Required in apps/backend/

1. **package.json** - Must have proper name: `@wealthlog/backend`
2. **prisma/schema.prisma** - Database schema
3. **.env** (local) or environment variables (production)

### Required in apps/web/

1. **package.json** - Must have proper name: `@wealthlog/web`
2. **next.config.js** - Next.js configuration
3. **.env.local** (local) or environment variables (production)

## Deployment Checklist

### Before Deploying

1. **Verify structure:**
   ```bash
   # Check required files exist
   ls wealthlogs-code/turbo.json
   ls wealthlogs-code/vercel.json
   ls wealthlogs-code/package.json
   ```

2. **Test build locally:**
   ```bash
   cd wealthlogs-code
   npm run build
   ```

3. **Run deployment check:**
   ```bash
   ./scripts/maintain.sh deploy:check
   ```

### Deploy Frontend (Vercel)

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Deploy: frontend updates"
   git push origin main
   ```

2. Vercel will automatically deploy from GitHub

3. Monitor at: https://vercel.com/dashboard

### Deploy Backend (Render)

1. Push to GitHub (same as above)

2. Render will automatically deploy from GitHub

3. Monitor at: https://dashboard.render.com

### Post-Deployment

1. **Test authentication:**
   ```bash
   ./scripts/maintain.sh auth:test prod
   ```

2. **Check endpoints:**
   ```bash
   curl https://wealthlog-backend-hx43.onrender.com/api/auth/debug
   curl https://wealthlogs.com
   ```

## Troubleshooting

### Vercel Build Fails

**Error:** "Cannot find module 'turbo'"
**Solution:** Ensure turbo.json exists in wealthlogs-code/

**Error:** "Cannot find workspace"
**Solution:** Check package.json has workspaces field

### Render Build Fails

**Error:** "Prisma schema not found"
**Solution:** Ensure prisma/schema.prisma exists in apps/backend/

**Error:** "Cannot find module"
**Solution:** Check build command includes npm ci

### Both Fail

**Error:** "Module not found"
**Solution:** Ensure all packages have correct names in package.json:
- `@wealthlog/backend`
- `@wealthlog/web`
- `@wealthlog/shared`

## Directory Structure Rationale

- **wealthlogs-code/** contains all application code (required by deployment platforms)
- **scripts/** separated for maintenance tools (not deployed)
- **docs/** separated for documentation (not deployed)
- Both Vercel and Render use `wealthlogs-code` as their root
- turbo.json and vercel.json MUST be in wealthlogs-code/

## Migration Notes

If you previously had turbo.json in the root:
1. Keep the one in wealthlogs-code/ for deployment
2. The root one is not used by deployment platforms
3. Local development can work with either location

## Support

For deployment issues:
1. Check this guide first
2. Verify all required files exist
3. Check deployment logs on Vercel/Render
4. Test locally with production build
5. Use maintenance script diagnostics
