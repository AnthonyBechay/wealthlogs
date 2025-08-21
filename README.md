# WealthLogs - Personal Finance & Trading Platform

A comprehensive wealth management platform for tracking trades, investments, real estate, and financial insights.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/AnthonyBechay/wealthlogs
cd wealthlogs

# Initial setup
./maintain.sh init

# Configure database in wealthlogs-code/apps/backend/.env
# Update DATABASE_URL with your PostgreSQL connection

# Setup database
./maintain.sh db:setup

# Start development
./maintain.sh dev
```

## 📁 Project Structure

```
wealthlogs/                    
├── wealthlogs-code/          # Main application code
│   ├── apps/
│   │   ├── backend/          # Express.js API (@wealthlog/backend)
│   │   └── web/              # Next.js frontend (@wealthlog/web)
│   └── packages/
│       ├── shared/           # Shared utilities (@wealthlog/shared)
│       └── ui/               # UI components (@wealthlog/ui)
├── maintain.sh               # Maintenance tool
└── package.json             # Monorepo configuration
```

## 🛠️ Maintenance Tool

The project includes a comprehensive maintenance tool (`maintain.sh`) for managing development, testing, and deployment.

### Available Commands

#### Development
- `./maintain.sh init` - Setup/update project packages
- `./maintain.sh dev` - Start development servers
- `./maintain.sh build` - Build for production
- `./maintain.sh test` - Run comprehensive tests

#### Database
- `./maintain.sh db:setup` - Initial database setup
- `./maintain.sh db:migrate` - Run migrations
- `./maintain.sh db:reset` - Reset database (⚠️ deletes data)

#### Deployment
- `./maintain.sh deploy:check` - Pre-deployment validation
- `./maintain.sh deploy:status` - Check production status

#### Maintenance
- `./maintain.sh fix` - Auto-fix common issues
- `./maintain.sh clean` - Clean build artifacts
- `./maintain.sh status` - Project health check
- `./maintain.sh logs` - View detailed logs

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/wealthlog"

# Security
JWT_ACCESS_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_secret_here
SESSION_SECRET=your_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Environment
NODE_ENV=development
PORT=5000
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
```

### Environment-Specific Configs

The backend automatically loads environment-specific configurations:
- `.env.development` - Local development settings
- `.env.production` - Production settings
- `.env` - Base configuration (fallback)

## 🚢 Deployment

### Render (Backend)

**Settings:**
- Root Directory: Leave empty or `.`
- Build Command: 
  ```bash
  npm ci --workspaces --include-workspace-root && npm exec -- turbo run build --filter=@wealthlog/backend... --force && npm exec --workspace=@wealthlog/backend -- prisma generate && npm exec --workspace=@wealthlog/backend -- prisma migrate deploy
  ```
- Start Command: 
  ```bash
  npm exec --workspace=@wealthlog/backend -- node src/index.js
  ```

**Environment Variables:**
```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
JWT_ACCESS_SECRET=generate_new_secret
JWT_REFRESH_SECRET=generate_new_secret
SESSION_SECRET=generate_new_secret
ALLOWED_ORIGINS=https://wealthlogs.com,https://www.wealthlogs.com
FRONTEND_URL=https://wealthlogs.com
```

### Vercel (Frontend)

**Settings:**
- Root Directory: `wealthlogs-code/apps/web`
- Framework Preset: Next.js
- Build Command: Default or custom
- Output Directory: `.next`

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://wealthlog-backend-hx43.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

## 📋 Common Workflows

### Installing New Packages
```bash
# Navigate to the specific workspace
cd wealthlogs-code/apps/web  # or backend
npm install [package-name]

# Return to root and sync
cd ../../..
./maintain.sh init
```

### Before Deploying
```bash
# Always run pre-deployment check
./maintain.sh deploy:check

# If all checks pass
git add .
git commit -m "Your message"
git push origin master

# Verify deployment
./maintain.sh deploy:status
```

### Troubleshooting
```bash
# Check logs for errors
./maintain.sh logs

# Try auto-fix
./maintain.sh fix

# Clean and rebuild if needed
./maintain.sh clean
./maintain.sh init
```

## 🐛 Common Issues

### Render Build Cache Error
If you see "gzip: stdin: invalid compressed data":
1. Clear build cache in Render dashboard
2. Or add `--force` flag temporarily

### CORS Errors
- Ensure `ALLOWED_ORIGINS` is set correctly on Render
- Backend uses `.env.production` when `NODE_ENV=production`

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:5000 | xargs kill -9  # Backend
```

## 📦 Tech Stack

### Backend
- Node.js + Express.js
- PostgreSQL + Prisma ORM
- JWT Authentication
- Google OAuth 2.0
- Redis (sessions)

### Frontend
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- SWR (data fetching)
- Recharts (visualizations)

### Infrastructure
- Monorepo with Turborepo
- Render (backend hosting)
- Vercel (frontend hosting)
- PostgreSQL (database)

## 📝 Important Notes

1. **Package names vs folder names**: 
   - Package names: `@wealthlog/backend`, `@wealthlog/web`
   - Folder name: `wealthlogs-code`
   
2. **Always run `./maintain.sh deploy:check`** before deploying

3. **Environment files** (`.env`) are never committed

4. **Logs are automatically generated** in `.maintain-logs/`

5. **The maintenance tool** handles most common tasks

## 📄 License

Private repository - All rights reserved

## 👤 Author

Anthony Bechay

---

For detailed maintenance tool documentation, run:
```bash
./maintain.sh help
```