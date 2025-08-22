# WealthLog Quick Reference for Claude

## Project Overview
WealthLog is a comprehensive personal finance management platform built with Next.js (frontend) and Express.js (backend), using PostgreSQL for data storage.

## Directory Structure
```
C:\Users\User\Desktop\wealthlogs\
├── wealthlogs-code\           # Main application code
│   ├── apps\
│   │   ├── backend\          # Express.js API (port 5000)
│   │   ├── web\              # Next.js frontend (port 3000)
│   │   └── mobile\           # Capacitor mobile app
│   └── packages\
│       └── shared\           # Shared utilities
├── scripts\                  # Maintenance scripts
│   ├── maintain.sh          # Main script
│   └── config.env           # Configuration
└── docs\                    # Documentation
```

## Quick Commands

### Start Development
```bash
# Start all services
./scripts/maintain.sh dev

# Start backend only
./scripts/maintain.sh start backend

# Start frontend only  
./scripts/maintain.sh start frontend
```

### Database
```bash
# Setup database
./scripts/maintain.sh db:setup

# Run migrations
./scripts/maintain.sh db:migrate

# Open Prisma Studio
./scripts/maintain.sh db:studio
```

### Testing & Deployment
```bash
# Run tests
./scripts/maintain.sh test

# Check before deployment
./scripts/maintain.sh deploy:check

# Build for production
./scripts/maintain.sh build
```

### Troubleshooting
```bash
# Run diagnostics
./scripts/maintain.sh doctor

# Auto-fix issues
./scripts/maintain.sh fix

# Check logs
./scripts/maintain.sh logs
```

## Key Files

### Environment Files
- `wealthlogs-code/apps/backend/.env` - Backend configuration
- `wealthlogs-code/apps/web/.env.local` - Frontend configuration
- `scripts/config.env` - Maintenance script configuration

### Important Routes
- `/login` - Authentication page
- `/landing/landing` - Main dashboard
- `/dashboard/networth/summary` - Net worth dashboard

### API Endpoints
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/dashboard/networth/summary` - Dashboard data

## Production URLs
- Frontend: https://wealthlogs.com
- Backend: https://wealthlog-backend-hx43.onrender.com

## Common Issues & Solutions

### Port Already in Use
```bash
# Script will ask to kill process, or manually:
lsof -i:3000
kill -9 <PID>
```

### Database Connection Failed
1. Check PostgreSQL is running
2. Verify credentials in `scripts/config.env`
3. Run `./scripts/maintain.sh config validate`

### Authentication Issues
1. Ensure JWT secrets match in backend/.env
2. Check CORS settings for production
3. Test with `./scripts/maintain.sh auth:test`

### Build Failures
```bash
# Clean and rebuild
./scripts/maintain.sh clean
./scripts/maintain.sh init
```

## Test Credentials
- Username: bech
- Password: 123

## Notes for Development
1. Always run `deploy:check` before deploying
2. The script is in `scripts/` directory (not root)
3. Configuration is in `scripts/config.env`
4. Logs are in `.maintain-logs/` directory
5. Use individual service starts for development efficiency
