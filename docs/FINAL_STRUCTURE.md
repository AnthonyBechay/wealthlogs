# WealthLog - CORRECT File Structure

## ✅ FINAL STRUCTURE (After Cleanup)

```
wealthlogs/                          # Git repository root
├── wealthlogs-code/                 # Application code directory
│   ├── turbo.json                  # ✅ ONLY HERE (for Turborepo)
│   ├── vercel.json                 # ✅ ONLY HERE (for Vercel deployment)
│   ├── package.json                # Workspace configuration
│   ├── package-lock.json           
│   ├── apps/
│   │   ├── backend/                # Express.js backend
│   │   │   ├── package.json
│   │   │   ├── src/
│   │   │   └── prisma/
│   │   ├── web/                    # Next.js frontend
│   │   │   ├── package.json
│   │   │   ├── pages/
│   │   │   └── components/
│   │   └── mobile/                 # Capacitor mobile app
│   └── packages/
│       └── shared/                 # Shared utilities
├── scripts/                         # Maintenance scripts
│   ├── maintain.sh                 # Main maintenance script
│   ├── config.env                  # Configuration (FIXED)
│   └── README.md                   # Script documentation
├── docs/                           # Documentation
│   ├── guides/
│   ├── api/
│   └── DEPLOYMENT_CONFIG.md
├── .backup/                        # Backup files
├── .maintain-logs/                 # Script logs
├── package.json                    # Root package (minimal)
├── .gitignore
└── README.md                       # Project README
```

## ❌ FILES REMOVED (No Longer Needed in Root)
- `wealthlogs/turbo.json` - REMOVED (only need in wealthlogs-code/)
- `wealthlogs/vercel.json` - REMOVED (only need in wealthlogs-code/)

## 📝 WHY THIS STRUCTURE?

### For Deployment (Vercel & Render)
- Both platforms use `wealthlogs-code` as their root directory
- They look for `turbo.json` and `vercel.json` IN that directory
- They don't see or care about files outside `wealthlogs-code`

### For Local Development
- Maintenance script works from repository root
- Scripts are separated from application code
- Documentation is organized outside deployment directory

## 🚀 CORRECT USAGE

### Starting Services
```bash
# From repository root (wealthlogs/)
cd /c/Users/User/Desktop/wealthlogs

# Start all services
./scripts/maintain.sh dev

# Start frontend only
./scripts/maintain.sh start frontend

# Start backend only
./scripts/maintain.sh start backend
```

### Deployment Settings

#### Vercel (Frontend)
```
Root Directory: wealthlogs-code
Build Command: npm run build:web
Output Directory: apps/web/.next
Install Command: npm ci --workspaces --include-workspace-root
```

#### Render (Backend)
```
Root Directory: wealthlogs-code
Build Command: npm ci --workspaces --include-workspace-root && npx turbo run build --filter=@wealthlog/backend... && cd apps/backend && npx prisma generate && npx prisma migrate deploy
Start Command: cd apps/backend && node src/index.js
```

## ✅ VERIFICATION CHECKLIST

Check that these files exist:
- [ ] `wealthlogs-code/turbo.json` ✅
- [ ] `wealthlogs-code/vercel.json` ✅
- [ ] `wealthlogs-code/package.json` ✅

Check that these files DO NOT exist:
- [ ] `wealthlogs/turbo.json` ❌ (removed)
- [ ] `wealthlogs/vercel.json` ❌ (removed)

## 🔧 CONFIG.ENV FIX

The error "Bad address" was caused by the config file trying to source itself. This has been fixed by removing these lines:
```bash
# REMOVED - These lines caused the error:
set -a
source "${BASH_SOURCE[0]}"
set +a
```

The config file is now properly sourced by maintain.sh itself.

## 📌 IMPORTANT NOTES

1. **turbo.json and vercel.json MUST be in wealthlogs-code/**
   - This is where deployment platforms expect them
   - Do NOT duplicate them in the root

2. **Maintenance script runs from root**
   - It knows to look in wealthlogs-code/ for the application
   - Configuration is in scripts/config.env

3. **All npm commands in wealthlogs-code/**
   - `cd wealthlogs-code && npm install`
   - `cd wealthlogs-code && npm run dev`
   - `cd wealthlogs-code && npm run build`

## 🎯 SUMMARY

- ✅ Only ONE copy of turbo.json (in wealthlogs-code/)
- ✅ Only ONE copy of vercel.json (in wealthlogs-code/)
- ✅ config.env fixed (no self-sourcing)
- ✅ Deployment will work correctly
- ✅ Local development will work correctly
- ✅ Clean, organized structure

The structure is now correct and deployment-ready!
