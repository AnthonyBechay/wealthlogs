# WealthLog Development Documentation

## 📚 Documentation Structure

This directory contains comprehensive documentation for the WealthLog platform.

## Available Documentation

### 🔧 Development Guides
- **[Getting Started](guides/getting-started.md)** - First-time setup guide
- **[Development Workflow](guides/development-workflow.md)** - Git flow and best practices
- **[Testing Guide](guides/testing.md)** - How to write and run tests
- **[Deployment Guide](guides/deployment.md)** - Production deployment process

### 🏗️ Architecture
- **[System Architecture](architecture/system-design.md)** - Overall system design
- **[Database Schema](architecture/database.md)** - PostgreSQL schema documentation
- **[Authentication System](architecture/auth-system.md)** - JWT & OAuth implementation
- **[Mobile Architecture](architecture/mobile.md)** - Capacitor mobile app structure

### 📡 API Documentation
- **[API Overview](api/overview.md)** - REST API introduction
- **[Authentication Endpoints](api/auth.md)** - Auth API documentation
- **[Dashboard Endpoints](api/dashboard.md)** - Dashboard data APIs
- **[Account Management](api/accounts.md)** - Account CRUD operations

## Quick Links

### Essential Files
- **[Main README](../README.md)** - Project overview and setup
- **[Maintenance Script](../scripts/README.md)** - Script documentation
- **[Configuration](../scripts/config.env)** - Environment configuration

### For Developers

#### First Time Setup
1. Read [Getting Started Guide](guides/getting-started.md)
2. Run `./scripts/maintain.sh init`
3. Configure with `./scripts/maintain.sh config edit`
4. Setup database with `./scripts/maintain.sh db:setup`

#### Daily Development
- Start servers: `./scripts/maintain.sh dev`
- Run tests: `./scripts/maintain.sh test`
- Check status: `./scripts/maintain.sh status`

#### Before Deploying
- Always run: `./scripts/maintain.sh deploy:check`
- Follow [Deployment Guide](guides/deployment.md)

## Key Technologies

### Frontend
- **Next.js 14** - React framework
- **TailwindCSS** - Utility-first CSS
- **Recharts** - Data visualization
- **Capacitor** - Mobile app framework

### Backend
- **Express.js** - Node.js framework
- **Prisma** - ORM and database toolkit
- **JWT** - Authentication tokens
- **PostgreSQL** - Primary database

### Development Tools
- **Turborepo** - Monorepo management
- **TypeScript** - Type safety
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Environment Variables

### Development (.env files)
Created automatically by `./scripts/maintain.sh init`:
- `apps/backend/.env` - Backend environment
- `apps/web/.env.local` - Frontend environment
- `apps/mobile/.env` - Mobile environment

### Production (Platform Settings)
Set in deployment platforms:
- **Vercel** - Frontend environment variables
- **Render** - Backend environment variables

## Common Commands

```bash
# Configuration
./scripts/maintain.sh config edit     # Edit configuration
./scripts/maintain.sh config validate # Validate config

# Development
./scripts/maintain.sh dev            # Start all services
./scripts/maintain.sh start backend  # Backend only
./scripts/maintain.sh start frontend # Frontend only

# Database
./scripts/maintain.sh db:setup       # Create database
./scripts/maintain.sh db:migrate     # Run migrations
./scripts/maintain.sh db:studio      # Open Prisma Studio

# Testing
./scripts/maintain.sh test           # Run tests
./scripts/maintain.sh auth:test      # Test authentication

# Mobile
./scripts/maintain.sh mobile build ios     # Build iOS
./scripts/maintain.sh mobile build android # Build Android

# Deployment
./scripts/maintain.sh deploy:check   # Pre-deploy validation
./scripts/maintain.sh deploy:status  # Check production

# Maintenance
./scripts/maintain.sh doctor         # System diagnostics
./scripts/maintain.sh fix            # Auto-fix issues
./scripts/maintain.sh clean          # Clean artifacts
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check PostgreSQL is running
   - Verify credentials in config
   - Run `./scripts/maintain.sh db:setup`

2. **Port Conflicts**
   - Script will offer to kill processes
   - Or manually: `lsof -i:3000` and `kill -9 PID`

3. **Build Failures**
   - Run `./scripts/maintain.sh fix`
   - Check logs: `./scripts/maintain.sh logs`
   - Clean and rebuild: `./scripts/maintain.sh clean && ./scripts/maintain.sh init`

4. **Authentication Issues**
   - Test locally: `./scripts/maintain.sh auth:test`
   - Check JWT secrets in config
   - Verify CORS settings

## Support Resources

- **Logs:** `.maintain-logs/` directory
- **Config:** `scripts/config.env`
- **Help:** `./scripts/maintain.sh help`
- **Diagnostics:** `./scripts/maintain.sh doctor`

## Contributing

1. Create feature branch from `staging`
2. Make changes and test
3. Create PR to `staging`
4. After testing, PR to `main`

See [Development Workflow](guides/development-workflow.md) for details.

---

For additional help, run:
```bash
./scripts/maintain.sh help
```
