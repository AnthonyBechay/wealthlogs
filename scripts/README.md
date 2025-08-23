# WealthLog Maintenance Script Documentation

## Overview

The WealthLog maintenance script (`maintain.sh`) is a comprehensive tool designed to streamline development, testing, deployment, and maintenance of the WealthLog platform. Version 4.0 includes mobile app support, configuration management, and enhanced logging.

## Features

- 🚀 **Quick Setup** - Initialize project with one command
- ⚙️ **Configuration Management** - Centralized config with validation
- 📱 **Mobile Support** - Build and run iOS/Android apps
- 🔍 **Comprehensive Testing** - Automated test suite with detailed reporting
- 📝 **Advanced Logging** - All commands generate detailed logs
- 🔧 **Auto-fix** - Automatically fix common issues
- 🏗️ **Build Management** - Production builds for all platforms
- 🗄️ **Database Tools** - Migration, studio, and management
- 🚨 **Pre-deployment Checks** - Validate before deploying
- 📊 **System Diagnostics** - Health checks and monitoring

## Installation

```bash
# Make the script executable
chmod +x scripts/maintain.sh

# Create initial configuration
./scripts/maintain.sh config create

# Initialize the project
./scripts/maintain.sh init
```

## Configuration

The script uses `scripts/config.env` for all configuration. This centralizes environment variables and settings.

### Edit Configuration

```bash
./scripts/maintain.sh config edit
```

### Key Configuration Sections

1. **Database Configuration**
   - PostgreSQL connection details
   - Username, password, database name

2. **JWT & Security**
   - Access and refresh token secrets
   - Session secrets
   - All automatically used in .env files

3. **Google OAuth**
   - Client ID and secret
   - Callback URLs

4. **Production URLs**
   - Backend and frontend URLs
   - Used for deployment checks

5. **Mobile App Settings**
   - Bundle ID and app name
   - Platform-specific paths

## Command Reference

### 🚀 Quick Start Commands

#### Initialize Project
```bash
./scripts/maintain.sh init
```
- Installs all dependencies
- Creates environment files from config
- Builds shared packages
- Generates Prisma client

#### Start Development
```bash
./scripts/maintain.sh dev
```
Starts all services (frontend + backend) using Turborepo.

#### Start Individual Services
```bash
./scripts/maintain.sh start backend   # Port 5000
./scripts/maintain.sh start frontend  # Port 3000
./scripts/maintain.sh start mobile    # Port 5173
```

### ⚙️ Configuration Commands

#### Edit Configuration
```bash
./scripts/maintain.sh config edit
```
Opens configuration file in your default editor.

#### Validate Configuration
```bash
./scripts/maintain.sh config validate
```
Checks for missing or invalid configuration values.

#### Show Configuration
```bash
./scripts/maintain.sh config show
```
Displays current configuration (hides sensitive values).

### 📱 Mobile App Commands

#### Build Mobile Apps
```bash
./scripts/maintain.sh mobile build ios
./scripts/maintain.sh mobile build android
./scripts/maintain.sh mobile build both
```
Builds mobile apps and opens in respective IDEs.

#### Run Mobile Apps
```bash
./scripts/maintain.sh mobile run ios
./scripts/maintain.sh mobile run android
```
Runs apps on connected devices or emulators.

#### Sync Capacitor
```bash
./scripts/maintain.sh mobile sync
```
Syncs web assets with native projects.

#### Mobile Development Server
```bash
./scripts/maintain.sh mobile dev
```
Starts Vite development server for mobile.

### 🗄️ Database Commands

#### Setup Database
```bash
./scripts/maintain.sh db:setup
```
Creates database and runs initial migrations.

Shows SQL commands to create database:
```sql
CREATE USER abechay WITH PASSWORD 'password';
CREATE DATABASE wealthlog OWNER abechay;
GRANT ALL PRIVILEGES ON DATABASE wealthlog TO abechay;
```

#### Run Migrations
```bash
./scripts/maintain.sh db:migrate
./scripts/maintain.sh db:migrate "migration_name"
```

#### Open Prisma Studio
```bash
./scripts/maintain.sh db:studio
```
Opens GUI for database management (port 5555).

#### Reset Database
```bash
./scripts/maintain.sh db:reset
```
⚠️ **Warning:** Deletes all data!

### 🧪 Testing Commands

#### Run Test Suite
```bash
./scripts/maintain.sh test
```
Runs comprehensive tests:
- Configuration validation
- TypeScript compilation
- Build tests
- API route validation
- Mobile app builds

#### Test Authentication
```bash
./scripts/maintain.sh auth:test       # Local
./scripts/maintain.sh auth:test prod  # Production
```
Tests authentication flow and protected routes.

### 🚀 Deployment Commands

#### Pre-deployment Check
```bash
./scripts/maintain.sh deploy:check
```
**Always run before deploying!** Validates:
- Environment configuration
- Test suite passes
- No exposed secrets
- Clean git status
- Build success

#### Check Production Status
```bash
./scripts/maintain.sh deploy:status
```
Tests production endpoints and availability.

#### Build for Production
```bash
./scripts/maintain.sh build
```
Builds all applications for production.

### 🔧 Maintenance Commands

#### System Diagnostics
```bash
./scripts/maintain.sh doctor
```
Comprehensive system health check:
- Requirements verification
- Project structure validation
- Configuration check
- Database connection test

#### Quick Status Check
```bash
./scripts/maintain.sh status
```
Shows:
- Package installation status
- Environment files
- Database connection
- Port availability
- Log file count

#### Auto-fix Issues
```bash
./scripts/maintain.sh fix
```
Automatically fixes:
- TypeScript errors
- Missing type definitions
- API route configuration
- Environment file issues

#### Clean Project
```bash
./scripts/maintain.sh clean
```
Removes:
- node_modules directories
- Build artifacts
- Lock files
- Old environment files

### 📝 Logging Commands

#### View Latest Log
```bash
./scripts/maintain.sh logs
```

#### View Backend Logs
```bash
./scripts/maintain.sh logs backend
```

#### View Frontend Logs
```bash
./scripts/maintain.sh logs frontend
```

#### List All Logs
```bash
./scripts/maintain.sh logs list
```

#### Clean Old Logs
```bash
./scripts/maintain.sh logs clean
```
Keeps only the last 10 log files.

## Workflows

### First-time Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/wealthlogs.git
cd wealthlogs

# 2. Initialize project
./scripts/maintain.sh init

# 3. Edit configuration
./scripts/maintain.sh config edit

# 4. Create database
./scripts/maintain.sh db:setup

# 5. Start development
./scripts/maintain.sh dev
```

### Daily Development

```bash
# Start all services
./scripts/maintain.sh dev

# Or start specific service
./scripts/maintain.sh start backend
./scripts/maintain.sh start frontend

# Run tests
./scripts/maintain.sh test

# Check status
./scripts/maintain.sh status
```

### Before Deploying

```bash
# 1. Run deployment check
./scripts/maintain.sh deploy:check

# 2. Create feature branch
git checkout -b feature/your-feature

# 3. Commit changes
git add .
git commit -m "feat: your feature"

# 4. Push to GitHub
git push origin feature/your-feature

# 5. Create PR to staging branch
# 6. After merge, test on staging
# 7. Create PR from staging to main
```

### Troubleshooting

```bash
# 1. Run diagnostics
./scripts/maintain.sh doctor

# 2. Check logs
./scripts/maintain.sh logs

# 3. Try auto-fix
./scripts/maintain.sh fix

# 4. Clean and reinstall if needed
./scripts/maintain.sh clean
./scripts/maintain.sh init
```

### Mobile Development

```bash
# 1. Build web assets
./scripts/maintain.sh build

# 2. Sync with Capacitor
./scripts/maintain.sh mobile sync

# 3. Build for platform
./scripts/maintain.sh mobile build ios
./scripts/maintain.sh mobile build android

# 4. Run on device
./scripts/maintain.sh mobile run ios
```

## Logging System

All commands generate detailed logs stored in `.maintain-logs/`:

- **Log Location:** `.maintain-logs/maintain-YYYYMMDD-HHMMSS.log`
- **Latest Log:** `.maintain-logs/latest.log` (symlink)
- **Retention:** Keeps last 10 logs by default

### Log Levels

- **INFO:** General information
- **SUCCESS:** Successful operations
- **WARNING:** Non-critical issues
- **ERROR:** Critical failures
- **BUILD:** Build operations
- **TEST:** Test results
- **MOBILE:** Mobile app operations
- **CONFIG:** Configuration changes

## Environment Files

The script automatically creates and manages environment files:

### Backend (.env)
- Created in `apps/backend/.env`
- Uses values from `config.env`
- Includes all JWT secrets, database URL, OAuth settings

### Frontend (.env.local)
- Created in `apps/web/.env.local`
- Includes API URL and public OAuth client ID

### Mobile (.env)
- Created in `apps/mobile/.env`
- Includes Vite-specific environment variables

## Error Handling

The script includes comprehensive error handling:

1. **Port Conflicts:** Offers to kill existing processes
2. **Missing Dependencies:** Installs automatically
3. **Database Issues:** Provides setup instructions
4. **Build Failures:** Generates detailed logs
5. **Configuration Errors:** Validates and suggests fixes

## Best Practices

1. **Always run `deploy:check` before deploying**
2. **Keep configuration file updated**
3. **Check logs when issues occur**
4. **Use `doctor` for diagnostics**
5. **Run `test` after making changes**
6. **Use feature branches for development**
7. **Keep mobile app synced with web changes**

## Troubleshooting Guide

### Common Issues and Solutions

#### Port Already in Use
```bash
# Script will ask to kill process, or manually:
lsof -i:3000
kill -9 <PID>
```

#### Database Connection Failed
1. Check PostgreSQL is running
2. Verify credentials in `config.env`
3. Run `./scripts/maintain.sh config validate`
4. Create database: `./scripts/maintain.sh db:setup`

#### TypeScript Errors
```bash
# Auto-fix common issues
./scripts/maintain.sh fix

# Or manually install types
cd apps/web
npm install --save-dev @types/papaparse @types/node
```

#### Build Failures
```bash
# Clean and rebuild
./scripts/maintain.sh clean
./scripts/maintain.sh init
./scripts/maintain.sh build
```

#### Mobile App Not Building
1. Ensure Xcode (iOS) or Android Studio (Android) is installed
2. Run `./scripts/maintain.sh mobile sync`
3. Check Capacitor configuration
4. View logs for specific errors

## Advanced Features

### Custom Paths
You can override default paths in `config.env`:
```bash
CUSTOM_BACKEND_DIR="/custom/path/to/backend"
CUSTOM_FRONTEND_DIR="/custom/path/to/frontend"
CUSTOM_MOBILE_DIR="/custom/path/to/mobile"
```

### Feature Flags
Enable/disable features in `config.env`:
```bash
ENABLE_AUTH_TEST=true
ENABLE_DB_RESET=true
ENABLE_DEPLOY_COMMANDS=true
ENABLE_AUTO_BACKUP=false
```

### Rate Limiting
Configure in backend for production:
- Login attempts: 5 per 15 minutes
- API calls: Configurable per endpoint

## Version History

- **v4.0** - Mobile support, config management
- **v3.1** - Enhanced logging, better diagnostics
- **v3.0** - Added authentication testing
- **v2.0** - Database management, deployment checks
- **v1.0** - Initial release

## Support

For issues or questions:
1. Check this documentation
2. Run `./scripts/maintain.sh doctor`
3. Check logs: `./scripts/maintain.sh logs`
4. Review main documentation: [../README.md](../README.md)
5. Check specific docs in [../docs/](../docs/)

---

Built with ❤️ for the WealthLog development team
