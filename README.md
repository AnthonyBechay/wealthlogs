# WealthLog - Enterprise Wealth Management Platform

> **A production-ready, full-stack wealth management platform built with Next.js 15, Express.js, PostgreSQL, and TurboRepo monorepo architecture.**

[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 🎯 Overview

WealthLog is a comprehensive financial management solution designed for individuals and financial advisors to track, analyze, and optimize wealth across multiple asset classes. Built with modern web technologies and best practices, it offers real-time portfolio tracking, automated trade synchronization, and advanced analytics.

### 🌟 Key Features

- **Multi-Asset Portfolio Management**: Track stocks, forex, crypto, real estate, and commodities
- **Automated Trading Integration**: Direct sync with MT5, Binance, and other platforms
- **Advanced Analytics**: Real-time P&L, risk metrics, and performance analytics
- **Secure Authentication**: JWT with refresh tokens, OAuth 2.0, and email verification
- **Multi-Currency Support**: Handle international investments with real-time conversion
- **Role-Based Access Control**: Admin, user, and custom role management
- **Mobile Responsive**: Progressive Web App with offline capabilities

---

## 📁 Project Architecture

```
wealthlog/
├── wealthlog/                    # Inner project directory
│   ├── apps/
│   │   ├── backend/             # Express.js REST API & WebSocket server
│   │   │   ├── src/
│   │   │   │   ├── index.js          # Application entry point
│   │   │   │   ├── lib/              # Core libraries (Prisma, logger, email)
│   │   │   │   ├── middleware/       # Auth, validation, error handling
│   │   │   │   ├── routes/           # API endpoints organized by domain
│   │   │   │   ├── services/         # Business logic and external integrations
│   │   │   │   └── utils/            # Helper functions and utilities
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma     # Database schema definition
│   │   │   │   └── migrations/       # Database migration history
│   │   │   └── package.json
│   │   │
│   │   ├── web/                 # Next.js 15 frontend application
│   │   │   ├── src/
│   │   │   │   ├── app/              # App router pages and layouts
│   │   │   │   ├── components/       # React components
│   │   │   │   ├── hooks/            # Custom React hooks
│   │   │   │   ├── lib/              # Frontend utilities
│   │   │   │   └── styles/           # Global styles and themes
│   │   │   └── package.json
│   │   │
│   │   └── mobile/              # Capacitor mobile app (iOS/Android)
│   │       └── package.json
│   │
│   ├── packages/                # Shared packages across apps
│   │   ├── shared/             # Common types, constants, and utilities
│   │   │   ├── src/
│   │   │   │   ├── types/           # TypeScript type definitions
│   │   │   │   ├── constants/       # Shared constants
│   │   │   │   ├── utils/           # Shared utility functions
│   │   │   │   └── api/             # API client and types
│   │   │   └── package.json
│   │   │
│   │   └── ui/                 # Shared UI component library
│   │       ├── src/
│   │       │   └── components/      # Reusable UI components
│   │       └── package.json
│   │
│   ├── maintain.sh             # Project maintenance script
│   ├── turbo.json             # TurboRepo configuration
│   ├── package.json           # Root package.json with workspace configuration
│   └── README.md              # Inner README
│
├── .github/                    # GitHub Actions CI/CD workflows
├── .vscode/                    # VS Code settings
└── README.md                  # This file
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20 LTS | JavaScript runtime |
| **npm** | 10+ | Package manager |
| **PostgreSQL** | 15+ | Primary database |
| **Redis** | 7+ (optional) | Session store & caching |
| **Git** | Latest | Version control |

### Installation

#### Method 1: Automated Setup (Recommended)
```bash
# Clone the repository
git clone https://github.com/yourusername/wealthlog.git
cd wealthlog/wealthlog

# Run automated setup
./maintain.sh setup

# Configure database (edit the generated .env file)
nano apps/backend/.env

# Run migrations
./maintain.sh migrate

# Start development servers
./maintain.sh dev
```

#### Method 2: Manual Setup
```bash
# Clone and navigate
git clone https://github.com/yourusername/wealthlog.git
cd wealthlog/wealthlog

# Install dependencies
npm install

# Setup environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env

# Configure database in apps/backend/.env
# DATABASE_URL="postgresql://user:password@localhost:5432/wealthlog"

# Generate Prisma client
cd apps/backend
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development
cd ../..
npm run dev
```

### Accessing the Application

After successful setup:
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **Backend API**: http://localhost:5000
- 📊 **API Health**: http://localhost:5000/health
- 🗄️ **Database UI**: `npx prisma studio` (http://localhost:5555)

---

## 🔐 Authentication System

### Overview
WealthLog implements a robust, production-ready authentication system with multiple layers of security.

### Features
- **JWT Authentication**: Dual-token system (access + refresh)
- **OAuth 2.0**: Google, GitHub, and Microsoft integration
- **Email Verification**: Required for new accounts
- **Password Reset**: Secure token-based recovery
- **2FA Support**: Time-based one-time passwords (TOTP)
- **Session Management**: Redis-backed sessions with automatic cleanup
- **Rate Limiting**: Prevents brute force attacks

### API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/register` | POST | Create new account | No |
| `/api/auth/login` | POST | Login with email/password | No |
| `/api/auth/logout` | POST | Logout and invalidate tokens | Yes |
| `/api/auth/refresh` | POST | Get new access token | Refresh Token |
| `/api/auth/verify-email` | GET | Verify email address | No |
| `/api/auth/forgot-password` | POST | Request password reset | No |
| `/api/auth/reset-password` | POST | Reset password with token | No |
| `/api/auth/me` | GET | Get current user profile | Yes |
| `/api/auth/google` | GET | Initiate Google OAuth | No |
| `/api/auth/google/callback` | GET | Google OAuth callback | No |

---

## 🛠️ Development

### Available Scripts

| Command | Description | Usage |
|---------|-------------|-------|
| `npm run dev` | Start all apps in development mode | Daily development |
| `npm run build` | Build all apps for production | Before deployment |
| `npm run test` | Run test suites | Before commits |
| `npm run lint` | Lint all code | Code quality check |
| `npm run format` | Format code with Prettier | Code formatting |
| `npm run type-check` | TypeScript type checking | Type validation |
| `npm run clean` | Clean all build artifacts | Fresh start |

### Database Management

```bash
# Open Prisma Studio (GUI)
cd apps/backend
npx prisma studio

# Create migration
npx prisma migrate dev --name add_feature

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Seed database with sample data
npx prisma db seed
```

### Adding Dependencies

```bash
# Add to specific workspace
npm install package-name --workspace=@wealthlog/backend
npm install package-name --workspace=@wealthlog/web

# Add to shared packages
npm install package-name --workspace=@wealthlog/shared

# Add dev dependency to root
npm install -D package-name

# Update all dependencies
npm update --workspaces
```

---

## 📝 Environment Configuration

### Backend Environment Variables

Create `apps/backend/.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/wealthlog"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="different-secret-for-refresh-tokens"
SESSION_SECRET="session-secret-for-express-sessions"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email Service
RESEND_API_KEY="re_your_resend_api_key"
EMAIL_FROM="noreply@yourdomain.com"

# External Services
BINANCE_API_KEY="your-binance-api-key"
BINANCE_SECRET_KEY="your-binance-secret"
MT5_SYNC_TOKEN="your-mt5-sync-token"

# Application
NODE_ENV="development"
PORT="5000"
CLIENT_URL="http://localhost:3000"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3003"
```

### Frontend Environment Variables

Create `apps/web/.env`:

```env
# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_WS_URL="ws://localhost:5000"

# OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"

# Feature Flags
NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN="true"
NEXT_PUBLIC_ENABLE_MOBILE_APP="false"
```

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique secrets for JWT and sessions
- [ ] Configure production database with connection pooling
- [ ] Set up Redis for session management
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS with SSL certificates
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Implement rate limiting
- [ ] Set up CDN for static assets

### Deployment Platforms

#### Backend (Render/Railway/Heroku)

1. Create a new Web Service
2. Connect your GitHub repository
3. Set build command: `cd wealthlog/apps/backend && npm install && npx prisma generate`
4. Set start command: `cd wealthlog/apps/backend && npx prisma migrate deploy && npm start`
5. Add environment variables from production .env

#### Frontend (Vercel/Netlify)

1. Import your GitHub repository
2. Set root directory: `wealthlog/apps/web`
3. Set build command: `npm run build`
4. Add environment variables

---

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list                # Mac

# Test connection
psql -U postgres -h localhost

# Fix: Update DATABASE_URL in .env
```

#### Port Already in Use
```bash
# Find process
lsof -i :5000           # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 <PID>           # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

#### Module Not Found Errors
```bash
# Clean install
cd wealthlog
./maintain.sh clean
./maintain.sh install
```

#### Prisma Issues
```bash
cd apps/backend
npx prisma generate
npx prisma migrate reset  # WARNING: Deletes data
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Maintenance tasks

---

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [TurboRepo Documentation](https://turbo.build/repo/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Run `./maintain.sh status` to diagnose
3. Check logs in `apps/backend/logs/`
4. Open an issue on GitHub

---

<p align="center">
  Built with ❤️ using Next.js, Express, PostgreSQL, and Prisma
  <br><br>
  <a href="https://wealthlog.com">wealthlog.com</a>
</p>
