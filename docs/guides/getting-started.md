# Getting Started with WealthLog

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and **npm 9+**
- **PostgreSQL 14+**
- **Git**
- **A code editor** (VS Code recommended)
- **Redis** (optional, for caching)

For mobile development:
- **Xcode** (for iOS development on Mac)
- **Android Studio** (for Android development)

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/wealthlogs.git
cd wealthlogs
```

## Step 2: Create the PostgreSQL Database

### Option A: Using psql Command Line

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Run these SQL commands:
CREATE USER abechay WITH PASSWORD '12345678';
CREATE DATABASE wealthlog OWNER abechay;
GRANT ALL PRIVILEGES ON DATABASE wealthlog TO abechay;
\q
```

### Option B: Using pgAdmin or Other GUI

1. Connect to your PostgreSQL server
2. Create a new user: `abechay` with password `12345678`
3. Create a new database: `wealthlog` with owner `abechay`
4. Grant all privileges on the database to the user

> **Note:** You can use different credentials, just remember to update them in the configuration file later.

## Step 3: Initialize the Project

```bash
# Make the maintenance script executable
chmod +x scripts/maintain.sh

# Initialize the project
./scripts/maintain.sh init
```

This command will:
- ✅ Create default configuration file
- ✅ Install all npm dependencies
- ✅ Create environment files (.env)
- ✅ Build shared packages
- ✅ Generate Prisma client

## Step 4: Configure Your Environment

```bash
# Edit the configuration file
./scripts/maintain.sh config edit
```

Update these important values:
- **Database credentials** (if different from Step 2)
- **Google OAuth** credentials (optional, for Google login)
- **JWT secrets** (keep defaults for development)

### Getting Google OAuth Credentials (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Client Secret to config

## Step 5: Setup Database Schema

```bash
# Create tables and run migrations
./scripts/maintain.sh db:setup
```

This will:
- Connect to your PostgreSQL database
- Create all necessary tables
- Run initial migrations
- Set up indexes and constraints

## Step 6: Start Development Servers

```bash
# Start all services (recommended)
./scripts/maintain.sh dev
```

Or start services individually:

```bash
# Terminal 1: Start backend
./scripts/maintain.sh start backend

# Terminal 2: Start frontend
./scripts/maintain.sh start frontend
```

## Step 7: Access the Application

Open your browser and navigate to:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Database GUI:** `./scripts/maintain.sh db:studio` (opens at http://localhost:5555)

## Step 8: Test Login

Use these test credentials:
- **Username:** bech
- **Password:** 123

Or create a new account through the registration page.

## Verify Installation

Run the diagnostic tool to ensure everything is set up correctly:

```bash
./scripts/maintain.sh doctor
```

This will check:
- System requirements
- Project structure
- Configuration
- Database connection
- Dependencies

## Next Steps

### Explore the Codebase

```
wealthlogs/
├── wealthlogs-code/apps/backend   # Express.js API
├── wealthlogs-code/apps/web       # Next.js frontend
├── wealthlogs-code/apps/mobile    # Capacitor mobile app
└── wealthlogs-code/packages/shared # Shared utilities
```

### Run Tests

```bash
./scripts/maintain.sh test
```

### Make Your First Change

1. Create a feature branch:
```bash
git checkout -b feature/my-first-feature
```

2. Make changes and test:
```bash
./scripts/maintain.sh test
```

3. Commit your changes:
```bash
git add .
git commit -m "feat: my first feature"
```

### Build for Production

```bash
./scripts/maintain.sh build
```

### Deploy Check

Before deploying, always run:
```bash
./scripts/maintain.sh deploy:check
```

## Troubleshooting

### Port Already in Use

If you see "Port 3000/5000 is in use":
- The script will ask if you want to kill the process
- Or manually: `lsof -i:3000` then `kill -9 <PID>`

### Database Connection Failed

1. Ensure PostgreSQL is running:
```bash
# macOS
brew services start postgresql

# Ubuntu/Debian
sudo systemctl start postgresql

# Windows
# Start from Services app
```

2. Verify connection:
```bash
psql -U abechay -d wealthlog
```

3. Check configuration:
```bash
./scripts/maintain.sh config validate
```

### Missing Dependencies

If you see TypeScript or module errors:
```bash
./scripts/maintain.sh fix
```

### Build Failures

Clean and reinstall:
```bash
./scripts/maintain.sh clean
./scripts/maintain.sh init
```

## Common Development Tasks

### Add a New Package

```bash
# Add to frontend
cd wealthlogs-code/apps/web
npm install package-name

# Add to backend
cd wealthlogs-code/apps/backend
npm install package-name

# After adding packages
./scripts/maintain.sh init
```

### Database Changes

```bash
# After modifying schema
cd wealthlogs-code/apps/backend
npx prisma migrate dev --name your_migration_name

# View database
./scripts/maintain.sh db:studio
```

### Running in Different Modes

```bash
# Development mode (default)
NODE_ENV=development ./scripts/maintain.sh dev

# Production mode (for testing)
NODE_ENV=production ./scripts/maintain.sh start backend
```

## Mobile Development

### Setup Mobile Environment

1. Install Capacitor CLI:
```bash
npm install -g @capacitor/cli
```

2. Build and sync:
```bash
./scripts/maintain.sh mobile sync
```

3. Build for platform:
```bash
./scripts/maintain.sh mobile build ios
./scripts/maintain.sh mobile build android
```

## Getting Help

- **View all commands:** `./scripts/maintain.sh help`
- **Check logs:** `./scripts/maintain.sh logs`
- **Run diagnostics:** `./scripts/maintain.sh doctor`
- **Read documentation:** See [docs/README.md](../README.md)

## Support

If you encounter issues:
1. Check the logs: `./scripts/maintain.sh logs`
2. Run diagnostics: `./scripts/maintain.sh doctor`
3. Try auto-fix: `./scripts/maintain.sh fix`
4. Check the [troubleshooting guide](../README.md#troubleshooting)

---

Welcome to WealthLog! 🚀
