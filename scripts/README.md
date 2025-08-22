# WealthLog Maintenance Script Documentation

## Overview

The WealthLog maintenance script (`maintain.sh`) is a comprehensive tool for managing development, testing, deployment, and maintenance tasks for the WealthLog application. It provides a unified interface for all common operations with detailed logging and error handling.

## Installation & Setup

### 1. Initial Setup

The maintenance script is located in the `scripts/` directory:

```bash
cd /path/to/wealthlogs
chmod +x scripts/maintain.sh

# Create an alias for easier access (optional)
alias maintain='./scripts/maintain.sh'
```

### 2. Configuration

Edit the configuration file at `scripts/config.env`:

```bash
./scripts/maintain.sh config edit
```

Key configuration settings:
- **Database credentials** - PostgreSQL connection details
- **Test user** - Default user for authentication testing
- **Production URLs** - Your deployed application URLs
- **Development ports** - Local server ports
- **Google OAuth** - Client ID and secret from Google Cloud Console

### 3. First Run

```bash
# Initialize the project (install dependencies)
./scripts/maintain.sh init

# Setup database
./scripts/maintain.sh db:setup

# Start development servers
./scripts/maintain.sh dev
```

## Command Reference

### Service Management

#### Start Services

```bash
# Start all services (frontend + backend)
./scripts/maintain.sh dev
./scripts/maintain.sh start all

# Start backend only
./scripts/maintain.sh start backend

# Start frontend only
./scripts/maintain.sh start frontend
```

**Features:**
- Automatic port conflict detection
- Option to kill existing processes
- Environment file creation if missing
- Database migration check

#### Stop Services

```bash
# Stop all services
./scripts/maintain.sh stop all

# Stop specific service
./scripts/maintain.sh stop backend
./scripts/maintain.sh stop frontend
```

### Project Setup

#### Initialize/Update

```bash
./scripts/maintain.sh init
```

**What it does:**
- Installs/updates all dependencies
- Creates environment files if missing
- Builds shared packages
- Generates Prisma client
- Detects if it's a fresh install or update

### Database Management

#### Setup Database

```bash
./scripts/maintain.sh db:setup
```

Creates database and runs initial migrations.

#### Run Migrations

```bash
# Run pending migrations
./scripts/maintain.sh db:migrate

# Create named migration
./scripts/maintain.sh db:migrate "add_user_fields"
```

#### Reset Database

```bash
./scripts/maintain.sh db:reset
```

⚠️ **Warning:** This deletes all data!

#### Other Database Commands

```bash
# Open Prisma Studio (GUI)
./scripts/maintain.sh db:studio

# Backup database
./scripts/maintain.sh db:backup

# Restore from backup
./scripts/maintain.sh db:restore backup-file.sql

# Seed database with sample data
./scripts/maintain.sh db:seed
```

### Testing

#### Run Test Suite

```bash
./scripts/maintain.sh test
```

**Tests include:**
- Shared package build
- TypeScript validation
- Production build test
- Prisma schema validation
- API route configuration

#### Test Authentication

```bash
# Test local authentication
./scripts/maintain.sh auth:test

# Test production authentication
./scripts/maintain.sh auth:test prod
```

**Tests performed:**
- Login flow
- Token generation
- Protected routes
- CORS configuration

### Deployment

#### Pre-deployment Check

```bash
./scripts/maintain.sh deploy:check
```

**Validates:**
- Environment configuration
- Test suite passes
- No exposed secrets
- Git status
- Build success

#### Check Production Status

```bash
./scripts/maintain.sh deploy:status
```

Tests if production servers are responding.

#### Build for Production

```bash
./scripts/maintain.sh build
```

### Maintenance

#### Auto-fix Common Issues

```bash
./scripts/maintain.sh fix
```

**Fixes:**
- Missing type definitions
- TypeScript errors
- API route prefixes
- Package rebuilds

#### System Diagnostics

```bash
./scripts/maintain.sh doctor
```

**Checks:**
- System requirements
- Project structure
- Environment files
- Database connection
- Port availability
- Dependencies
- Common issues

#### Check Status

```bash
./scripts/maintain.sh status
```

Quick health check of the system.

#### Clean Project

```bash
./scripts/maintain.sh clean
```

Removes:
- node_modules directories
- Build artifacts
- Lock files
- Temporary files

### Configuration Management

#### Edit Configuration

```bash
./scripts/maintain.sh config edit
```

Opens configuration file in default editor.

#### Show Configuration

```bash
./scripts/maintain.sh config show
```

Displays current configuration (hides sensitive values).

#### Validate Configuration

```bash
./scripts/maintain.sh config validate
```

Tests database connection and validates settings.

#### Reset Configuration

```bash
./scripts/maintain.sh config reset
```

Resets to default configuration.

### Logging

#### View Logs

```bash
# View latest log
./scripts/maintain.sh logs

# List all logs
./scripts/maintain.sh logs list

# Clean old logs
./scripts/maintain.sh logs clean

# Follow logs in real-time
tail -f .maintain-logs/latest.log
```

## Configuration File Reference

The `scripts/config.env` file contains all configuration:

### Database Settings
```bash
DB_USERNAME="postgres"       # PostgreSQL username
DB_PASSWORD="password"        # PostgreSQL password
DB_NAME="wealthlog"          # Database name
DB_HOST="localhost"          # Database host
DB_PORT="5432"               # Database port
```

### Development Settings
```bash
DEV_FRONTEND_PORT=3000       # Next.js port
DEV_BACKEND_PORT=5000        # Express port
```

### Production URLs
```bash
PROD_BACKEND_URL="https://your-backend.onrender.com"
PROD_FRONTEND_URL="https://your-frontend.vercel.app"
```

### Google OAuth
```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### Feature Flags
```bash
ENABLE_AUTH_TEST=true        # Enable auth testing commands
ENABLE_DB_RESET=true         # Enable database reset
ENABLE_DEPLOY_COMMANDS=true  # Enable deployment commands
ENABLE_AUTO_BACKUP=false     # Auto-backup before destructive ops
```

## Workflows

### Daily Development

```bash
# Morning setup
./scripts/maintain.sh status          # Check system status
./scripts/maintain.sh start backend   # Start backend only
./scripts/maintain.sh start frontend  # Start frontend in another terminal

# Or start everything at once
./scripts/maintain.sh dev
```

### Before Deploying

```bash
# 1. Run deployment check
./scripts/maintain.sh deploy:check

# 2. Fix any issues
./scripts/maintain.sh fix

# 3. Test again
./scripts/maintain.sh test

# 4. Build production
./scripts/maintain.sh build

# 5. Deploy (automatic via git push)
git add .
git commit -m "Deploy: your message"
git push origin main

# 6. Verify deployment
./scripts/maintain.sh deploy:status
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

### Database Recovery

```bash
# Create backup
./scripts/maintain.sh db:backup

# If something goes wrong, restore
./scripts/maintain.sh db:restore backups/wealthlog-20240101-120000.sql
```

## Logging

All commands generate detailed logs stored in `.maintain-logs/`:

- **Log location:** `.maintain-logs/maintain-YYYYMMDD-HHMMSS.log`
- **Latest log symlink:** `.maintain-logs/latest.log`
- **Retention:** 30 days by default (configurable)
- **Auto-cleanup:** Old logs are automatically removed

### Log Levels

- **INFO:** General information
- **SUCCESS:** Successful operations
- **WARNING:** Non-critical issues
- **ERROR:** Critical failures
- **DEBUG:** Detailed debugging info

## Error Handling

The script includes comprehensive error handling:

1. **Exit on error:** Script stops on critical failures
2. **Validation:** Checks prerequisites before operations
3. **Rollback:** Some operations support rollback on failure
4. **Recovery suggestions:** Provides fix recommendations

## Advanced Features

### Custom Paths

Override default paths in `config.env`:

```bash
CUSTOM_BACKEND_DIR="/custom/path/to/backend"
CUSTOM_FRONTEND_DIR="/custom/path/to/frontend"
CUSTOM_SHARED_DIR="/custom/path/to/shared"
```

### Parallel Builds

Enable/disable in configuration:

```bash
BUILD_PARALLEL=true
BUILD_CACHE=true
```

### Notifications

Configure deployment notifications:

```bash
NOTIFY_ON_DEPLOY=true
NOTIFY_EMAIL="your@email.com"
NOTIFY_WEBHOOK="https://hooks.slack.com/..."
```

## Best Practices

1. **Always run `deploy:check` before deploying**
2. **Keep configuration file updated**
3. **Check logs when issues occur**
4. **Use `doctor` for diagnostics**
5. **Create backups before database operations**
6. **Test authentication after deployment**
7. **Use individual service starts for development**
8. **Clean project periodically**

## Troubleshooting

### Port Already in Use

```bash
# The script will ask to kill the process
# Or manually:
lsof -i:3000  # Find process
kill -9 <PID>  # Kill process
```

### Database Connection Failed

1. Check PostgreSQL is running
2. Verify credentials in `config.env`
3. Run `./scripts/maintain.sh config validate`

### Build Failures

1. Check TypeScript errors: `./scripts/maintain.sh test`
2. Try auto-fix: `./scripts/maintain.sh fix`
3. Clean and rebuild: `./scripts/maintain.sh clean && ./scripts/maintain.sh init`

### Authentication Not Working

1. Check environment variables are set
2. Verify JWT secrets match between frontend and backend
3. Test with: `./scripts/maintain.sh auth:test`

## Updates & Maintenance

The script is self-documenting and includes:

- Version information in the header
- Inline comments for complex operations
- Help command with examples
- Configuration validation

To update the script:
1. Keep the original structure
2. Add new commands in the appropriate section
3. Update help text
4. Test thoroughly before committing

## Support

For issues:
1. Check this documentation
2. Run `./scripts/maintain.sh help`
3. Check logs in `.maintain-logs/`
4. Run diagnostics with `./scripts/maintain.sh doctor`

## Version History

- **v4.0** - Added individual service management, configuration file
- **v3.1** - Enhanced logging, better error handling
- **v3.0** - Added auth testing, deployment checks
- **v2.0** - Database management, fix command
- **v1.0** - Initial version with basic commands
