# WealthLog Maintenance Scripts v5.0

## 🚀 Overview

The WealthLog maintenance system provides a comprehensive set of tools for managing, building, testing, and deploying the WealthLog application. Built with a modular architecture for maintainability and scalability.

## 📁 Structure

```
scripts/
├── maintain.sh          # Main entry point
├── config.env          # Configuration file
├── lib/                # Modular libraries
│   ├── common.sh       # Shared utilities
│   ├── config.sh       # Configuration management
│   ├── database.sh     # Database operations
│   ├── doctor.sh       # System diagnostics
│   ├── logs.sh         # Logging management
│   └── mobile.sh       # Mobile app management
└── README.md           # This file
```

## 🔧 Installation

```bash
# Make scripts executable
chmod +x scripts/maintain.sh
chmod +x scripts/lib/*.sh

# Initialize project
./scripts/maintain.sh init
```

## ⚙️ Configuration

The `config.env` file contains all configuration settings, organized into sections:

### Frequently Changed Settings
- **Database Configuration**: Host, port, username, password
- **Deployment URLs**: Production and staging URLs
- **Development Ports**: Frontend, backend, mobile ports

### Security Settings
- **JWT Secrets**: Auto-generated if not set
- **Google OAuth**: Client ID and secret

### Run Configuration Commands
```bash
# View current configuration
./scripts/maintain.sh config show

# Edit configuration
./scripts/maintain.sh config edit

# Validate configuration
./scripts/maintain.sh config validate

# Export to .env files
./scripts/maintain.sh config export
```

## 📖 Command Reference

### Quick Start Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize or update the project |
| `dev` | Start all development servers |
| `start [service]` | Start specific service (backend/frontend/mobile/all) |
| `test` | Run comprehensive test suite |
| `build` | Build for production |

### Configuration Management

| Command | Description |
|---------|-------------|
| `config` | Show current configuration |
| `config edit` | Edit configuration file |
| `config validate` | Validate all settings |
| `config create` | Create default configuration |
| `config export` | Export to .env files |

### Database Management

| Command | Description |
|---------|-------------|
| `db:setup` | Initialize database with migrations |
| `db:migrate [name]` | Run or create migrations |
| `db:studio` | Open Prisma Studio GUI |
| `db:reset` | Reset database (⚠️ deletes data) |
| `db:status` | Check database status |
| `db:backup` | Create database backup |
| `db:restore [file]` | Restore from backup |

### Mobile App Management

| Command | Description |
|---------|-------------|
| `mobile init` | Initialize mobile app |
| `mobile sync` | Sync web assets to native |
| `mobile build [platform]` | Build mobile app (ios/android/both) |
| `mobile run [platform]` | Run on device/emulator |
| `mobile dev` | Start mobile dev server |
| `mobile doctor` | Check mobile requirements |

### Logging Management

| Command | Description |
|---------|-------------|
| `logs` | View latest maintenance log |
| `logs backend` | View backend logs |
| `logs frontend` | View frontend logs |
| `logs mobile` | View mobile logs |
| `logs list` | List all logs |
| `logs clean [keep]` | Clean old logs |
| `logs search [term]` | Search in logs |
| `logs follow [service]` | Follow logs in real-time |
| `logs export` | Export all logs |

### System Diagnostics

| Command | Description |
|---------|-------------|
| `doctor` | Run comprehensive diagnostics |
| `status` | Quick status check |
| `fix` | Auto-fix common issues |
| `clean` | Clean all build artifacts |

### Deployment

| Command | Description |
|---------|-------------|
| `deploy:check` | Pre-deployment validation |
| `auth:test [env]` | Test authentication (local/prod) |

## 🎯 Common Workflows

### First-Time Setup
```bash
# 1. Initialize project
./scripts/maintain.sh init

# 2. Configure settings
./scripts/maintain.sh config edit

# 3. Setup database
./scripts/maintain.sh db:setup

# 4. Start development
./scripts/maintain.sh dev
```

### Daily Development
```bash
# Start all services
./scripts/maintain.sh dev

# Or start individually
./scripts/maintain.sh start backend
./scripts/maintain.sh start frontend
```

### Before Deployment
```bash
# 1. Run pre-deployment check
./scripts/maintain.sh deploy:check

# 2. Test authentication
./scripts/maintain.sh auth:test prod

# 3. Build for production
./scripts/maintain.sh build

# 4. Push to git (triggers auto-deployment)
git push origin main
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
# 1. Initialize mobile app
./scripts/maintain.sh mobile init

# 2. Build for both platforms
./scripts/maintain.sh mobile build both

# 3. Run on Android
./scripts/maintain.sh mobile run android

# 4. Run on iOS (macOS only)
./scripts/maintain.sh mobile run ios
```

## 🔍 Diagnostics Features

The `doctor` command performs comprehensive checks:

- **System Requirements**: Node.js, npm, Git versions
- **Project Structure**: Directory existence
- **Dependencies**: Installation status
- **Configuration**: Environment files, secrets
- **Database**: Connection, migration status
- **Network**: Port availability
- **Security**: JWT secrets, passwords
- **Git**: Repository status, uncommitted changes
- **Resources**: Disk space, memory
- **Production Readiness**: Build status, TypeScript errors

## 📊 Logging System

All commands generate detailed logs:

- **Location**: `.maintain-logs/` directory
- **Latest log**: Symlinked to `latest.log`
- **Retention**: Configurable (default: 20 files)
- **Features**: 
  - Search across logs
  - Follow in real-time
  - Export for sharing
  - Auto-cleanup

## 🛡️ Security Features

- **Auto-generated secrets**: JWT tokens generated if not set
- **Password validation**: Warns about default passwords
- **Secure configuration**: Sensitive data in `config.env`
- **Environment isolation**: Separate configs for dev/staging/prod

## 🐛 Error Handling

- **Error trapping**: Catches and logs all errors
- **Helpful messages**: Context-specific error guidance
- **Recovery suggestions**: Auto-fix recommendations
- **Detailed logging**: Full error traces in log files

## 🎨 User Experience

- **Colored output**: Visual feedback with colors and emojis
- **Progress indicators**: Spinners for long operations
- **Interactive prompts**: Confirmations for destructive actions
- **Status summaries**: Clear success/failure indicators

## 🔄 Updates

To update the maintenance scripts:

```bash
# Pull latest changes
git pull

# Re-initialize
./scripts/maintain.sh init
```

## 📝 Environment Variables

The scripts manage these environment files:

- `scripts/config.env` - Main configuration
- `apps/backend/.env` - Backend environment
- `apps/web/.env.local` - Frontend environment
- `apps/mobile/.env` - Mobile environment

## 🆘 Getting Help

```bash
# Show all available commands
./scripts/maintain.sh help

# Run diagnostics
./scripts/maintain.sh doctor

# Check logs for errors
./scripts/maintain.sh logs
```

## 🤝 Contributing

When adding new features:

1. Create new module in `lib/` if needed
2. Update `maintain.sh` to include new commands
3. Add command to help text
4. Update this README
5. Test thoroughly

## 📄 License

Part of the WealthLog project. See main LICENSE file.
