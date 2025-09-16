# 💰 WealthLog - Personal Finance Management Platform

**Clean, Secure, and Mobile-Ready Financial Management Application**

## ✅ Project Status

### What's Been Fixed
- ✅ **Fixed crypto.randomBytes error** - Now uses browser-compatible Web Crypto API
- ✅ **Simplified codebase** - Removed overly complex abstractions
- ✅ **Maintained security** - Kept essential security features (password validation, rate limiting, CSRF protection)
- ✅ **Cleaned up scripts** - Old maintenance scripts moved to `scripts/archived/`
- ✅ **Fixed all imports** - Shared package properly exports all needed utilities
- ✅ **Mobile-ready** - All code is Capacitor-compatible for mobile deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and setup:**
```bash
git clone https://github.com/yourusername/wealthlogs.git
cd wealthlogs
```

2. **Run setup (Windows):**
```bash
setup.bat
```

**Or Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

3. **Configure database:**

Edit `wealthlogs-code/apps/backend/.env`:
```env
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/wealthlog
```

4. **Start development:**
```bash
npm run dev
```

### Access Points
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Database GUI:** `npm run db:studio`

### Default Login
- Username: `bech`
- Password: `123`

## 📁 Clean Project Structure

```
wealthlogs/
├── package.json           # All npm scripts (simplified)
├── setup.bat             # Windows setup
├── setup.sh              # Mac/Linux setup
├── README.md             # Main documentation
├── GETTING_STARTED.md    # Quick start guide
│
├── wealthlogs-code/
│   ├── apps/
│   │   ├── backend/      # Express.js API (Node.js)
│   │   │   ├── src/
│   │   │   ├── prisma/   # Database schema
│   │   │   └── .env      # Backend config
│   │   │
│   │   ├── web/          # Next.js frontend
│   │   │   ├── pages/    # Next.js pages
│   │   │   ├── src/      # Components & services
│   │   │   └── .env.local # Frontend config
│   │   │
│   │   └── mobile/       # Capacitor mobile app
│   │       ├── src/      # Mobile-specific code
│   │       ├── ios/      # iOS project
│   │       └── android/  # Android project
│   │
│   └── packages/
│       └── shared/       # Shared utilities
│           ├── src/
│           │   ├── services/
│           │   │   ├── api-client.ts    # API client
│           │   │   ├── security.ts      # Security utils
│           │   │   ├── error-handler.ts # Error handling
│           │   │   └── monitoring.ts    # Logging
│           │   └── index.ts             # Main exports
│           └── dist/                     # Built files
│
├── docs/                 # Documentation
└── scripts/
    ├── config.env        # Your configuration
    ├── README.md         # Scripts info
    └── archived/         # Old scripts (deleted)
```

## 🛡️ Security Features

### What's Maintained
1. **Password Security**
   - Password strength validation
   - Minimum 8 characters with complexity requirements
   - Bcrypt hashing (10 rounds)

2. **Rate Limiting**
   - Login attempts: 5 per minute
   - API endpoints: Configurable limits

3. **Token Management**
   - JWT access tokens (15 minutes)
   - Refresh tokens (7 days)
   - Automatic token rotation

4. **CSRF Protection**
   - CSRF tokens for state-changing operations
   - Session storage for tokens

5. **Input Sanitization**
   - XSS protection via HTML sanitization
   - SQL injection prevention via Prisma

## 📜 Available NPM Scripts

All commands run from the root directory:

### Development
```bash
npm run dev              # Start both frontend and backend
npm run dev:web          # Start frontend only (port 3000)
npm run dev:backend      # Start backend only (port 5000)
npm run dev:mobile       # Start mobile development
```

### Building
```bash
npm run build            # Build everything
npm run build:shared     # Build shared package
npm run build:web        # Build frontend
npm run build:backend    # Build backend
npm run build:mobile     # Build mobile app
```

### Database
```bash
npm run db:migrate       # Run migrations
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio GUI
npm run db:reset         # Reset database (WARNING: deletes data)
```

### Testing & Maintenance
```bash
npm run test             # Run all tests
npm run test:backend     # Test backend only
npm run test:web         # Test frontend only
npm run lint             # Run linting
npm run clean            # Clean build artifacts
npm run fresh            # Clean install (removes node_modules)
```

### Mobile (Capacitor)
```bash
npm run mobile:sync      # Sync Capacitor
npm run mobile:ios       # Run on iOS
npm run mobile:android   # Run on Android
```

## 🔧 Configuration

### Backend Environment Variables
`wealthlogs-code/apps/backend/.env`
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/wealthlog

# JWT Secrets (use: openssl rand -hex 32)
JWT_ACCESS_SECRET=your-32-character-secret
JWT_REFRESH_SECRET=another-32-character-secret
SECRET_KEY=same-as-jwt-access-secret
SESSION_SECRET=another-secure-secret

# Server
NODE_ENV=development
PORT=5000

# Frontend
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Frontend Environment Variables
`wealthlogs-code/apps/web/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

## 📱 Mobile Development (Capacitor)

### Setup for Mobile
```bash
# 1. Build the web app
cd wealthlogs-code/apps/web
npm run build

# 2. Copy to mobile
cd ../mobile
npx cap sync

# 3. Run on device/emulator
npx cap run ios       # For iOS
npx cap run android   # For Android
```

### Mobile Compatibility
All code is written to be compatible with:
- Web browsers (Chrome, Firefox, Safari, Edge)
- iOS (via Capacitor)
- Android (via Capacitor)

Key compatibility features:
- No Node.js-specific APIs in frontend code
- Browser-compatible crypto utilities
- Proper storage abstraction for mobile
- Responsive UI design

## 🚀 Deployment

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
3. Deploy automatically on push to main

### Backend (Render)
1. Create Web Service on Render
2. Connect GitHub repo
3. Set environment variables (all from .env)
4. Deploy automatically on push to main

### Database (Production)
Consider using:
- Supabase (PostgreSQL)
- Railway (PostgreSQL)
- Neon (PostgreSQL)
- AWS RDS

## 🐛 Troubleshooting

### Common Issues & Solutions

**Module not found errors:**
```bash
npm run clean
npm install
npm run build:shared
```

**Database connection failed:**
1. Ensure PostgreSQL is running
2. Check DATABASE_URL in backend/.env
3. Run: `npm run db:push`

**Port already in use:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i:3000
kill -9 <PID>
```

**Frontend not loading:**
1. Check backend is running on port 5000
2. Verify NEXT_PUBLIC_API_URL in .env.local
3. Clear browser cache

**Authentication not working:**
1. Check JWT secrets are set in backend/.env
2. Ensure cookies are enabled
3. Verify CORS settings include your frontend URL

## 🏗️ Architecture Overview

### Backend (Express.js + Prisma)
- **Authentication:** JWT-based with refresh tokens
- **Database:** PostgreSQL with Prisma ORM
- **Security:** Rate limiting, CORS, helmet, bcrypt
- **API:** RESTful endpoints with validation

### Frontend (Next.js + React)
- **Routing:** Next.js Pages Router
- **Styling:** TailwindCSS
- **State:** React Context API
- **API Communication:** Axios with interceptors
- **Security:** CSRF protection, input sanitization

### Shared Package
- **API Client:** Axios wrapper with retry logic
- **Security Utils:** Password validation, sanitization
- **Error Handling:** Centralized error types
- **Monitoring:** Simple logging and metrics

### Mobile (Capacitor)
- **Framework:** Same React/Next.js codebase
- **Native Bridge:** Capacitor plugins
- **Storage:** Preferences API for mobile
- **Authentication:** Same JWT system

## 📊 Features

### Current Features
- 📊 Financial Dashboard
- 💼 Multiple Account Types
- 📈 Investment Tracking
- 💳 Expense Management
- 🏠 Real Estate Portfolio
- 💰 Loan Management
- 📅 Financial Forecasting
- 🔐 Secure Authentication
- 📱 Mobile Support

### Security Features
- JWT Authentication
- Password Strength Validation
- Rate Limiting
- CSRF Protection
- Input Sanitization
- Secure Headers
- Session Management
- Role-Based Access Control

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Commit Convention
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style
- `refactor:` Refactoring
- `test:` Testing
- `chore:` Maintenance

## 📄 License

MIT License - See LICENSE file for details

## 📞 Support

- **Email:** anthonybechay1@gmail.com
- **Documentation:** See `/docs` directory
- **Issues:** GitHub Issues

---

**Built with ❤️ for better financial management**

*Clean, Secure, and Mobile-Ready*
