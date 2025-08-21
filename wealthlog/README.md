# WealthLog Development Guide

## 🚀 Quick Start for New Developers

Welcome to WealthLog! This guide will get you up and running in minutes.

### First Day Setup Checklist

- [ ] Clone the repository
- [ ] Install prerequisites (Node.js 20, PostgreSQL 15)
- [ ] Run setup script: `./maintain.sh setup`
- [ ] Configure database connection in `.env`
- [ ] Run migrations: `./maintain.sh migrate`
- [ ] Start development: `./maintain.sh dev`
- [ ] Access frontend at http://localhost:3000
- [ ] Test API at http://localhost:5000/health

---

## 🛠️ Daily Development Commands

### Most Used Commands

```bash
# Start everything (90% of the time you'll use this)
./maintain.sh dev

# After pulling changes from git
git pull
./maintain.sh quick-install
./maintain.sh migrate

# When something breaks
./maintain.sh clean
./maintain.sh install
```

### Understanding maintain.sh

The `maintain.sh` script is your Swiss Army knife for project management:

| Command | What it does | When to use |
|---------|--------------|-------------|
| `setup` | Initial project setup with .env files | First time only |
| `dev` | Start frontend + backend dev servers | Every day development |
| `install` | Clean install of all dependencies | When dependencies are broken |
| `quick-install` | Fast dependency update | After git pull or adding packages |
| `build` | Production build of all apps | Before deployment |
| `clean` | Remove all node_modules and build artifacts | Complete fresh start |
| `migrate` | Run database migrations | After schema changes |
| `status` | Check system health and configuration | When debugging issues |
| `test` | Run all test suites | Before committing code |
| `lint` | Check code quality | Before creating PR |

### Manual Commands (when maintain.sh isn't enough)

```bash
# Backend only
cd apps/backend
npm run dev           # Start backend only
npm run build         # Build backend
npm run test          # Test backend

# Frontend only
cd apps/web
npm run dev           # Start frontend only
npm run build         # Build frontend
npm run test          # Test frontend

# Database
cd apps/backend
npx prisma studio     # Visual database editor
npx prisma migrate dev --name your_migration  # Create migration
npx prisma generate   # Regenerate client
npx prisma migrate reset  # Reset database (WARNING: deletes all data)
```

---

## 📂 Project Structure Explained

### Where to Find Things

```
wealthlog/
├── apps/
│   ├── backend/          # 🔌 API Server (Express.js)
│   │   ├── src/
│   │   │   ├── index.js         # Server entry point
│   │   │   ├── routes/          # API endpoints
│   │   │   │   ├── auth/        # Authentication endpoints
│   │   │   │   │   └── auth.js
│   │   │   │   ├── account/     # Account management
│   │   │   │   │   ├── account.routes.js
│   │   │   │   │   └── transactions.routes.js
│   │   │   │   ├── trade/       # Trading features
│   │   │   │   │   ├── trade.routes.js
│   │   │   │   │   ├── filter.routes.js
│   │   │   │   │   └── mt5sync.routes.js
│   │   │   │   ├── settings/    # User settings
│   │   │   │   │   ├── generalSettings.routes.js
│   │   │   │   │   ├── tradingSettings.routes.js
│   │   │   │   │   └── tradingInsights.routes.js
│   │   │   │   └── landing/     # Dashboard and analytics
│   │   │   │       └── dashboard.js
│   │   │   ├── middleware/      # Request processing
│   │   │   │   ├── auth.middleware.js
│   │   │   │   └── passport.config.js
│   │   │   ├── services/        # Business logic
│   │   │   └── lib/             # Core utilities
│   │   │       ├── prisma.js
│   │   │       └── logger.js
│   │   └── prisma/
│   │       └── schema.prisma    # Database schema
│   │
│   └── web/              # 🌐 Frontend (Next.js)
│       └── src/
│           ├── app/             # Pages and routing
│           │   ├── auth/        # Auth pages
│           │   │   ├── login/
│           │   │   ├── register/
│           │   │   ├── verify-email/
│           │   │   ├── forgot-password/
│           │   │   └── reset-password/
│           │   ├── dashboard/   # Main application
│           │   ├── portfolio/   # Portfolio management
│           │   ├── trades/      # Trading interface
│           │   └── settings/    # User settings
│           ├── components/      # React components
│           │   ├── auth/        # Auth components
│           │   ├── dashboard/   # Dashboard components
│           │   ├── trades/      # Trading components
│           │   └── ui/          # Reusable UI components
│           ├── hooks/           # Custom React hooks
│           └── lib/            # Frontend utilities
│
└── packages/
    └── shared/           # 📦 Shared code between frontend and backend
        └── src/
            ├── types/          # TypeScript type definitions
            ├── constants/      # Shared constants
            ├── utils/          # Shared utility functions
            └── api/           # API client and types
```

### Where to Add New Features

| Feature Type | Location | Example |
|--------------|----------|---------|
| New API endpoint | `apps/backend/src/routes/` | Create `routes/analytics/metrics.routes.js` |
| New page | `apps/web/src/app/` | Create `app/portfolio/[id]/page.tsx` |
| React component | `apps/web/src/components/` | Create `components/charts/ProfitChart.tsx` |
| Shared types | `packages/shared/src/types/` | Add to `types/trade.types.ts` |
| Database model | `apps/backend/prisma/schema.prisma` | Add new model and run migration |
| API service | `apps/backend/src/services/` | Create `services/notificationService.js` |
| Custom hook | `apps/web/src/hooks/` | Create `hooks/usePortfolio.ts` |

---

## 🔐 Authentication System Guide

### Current Implementation

Our authentication system uses JWT tokens with refresh token rotation for maximum security.

### Authentication Flow

1. **Registration Flow**
   ```
   User registers → 
   Email verification sent → 
   User clicks verification link → 
   Account activated → 
   Auto-login with tokens
   ```

2. **Login Flow**
   ```
   User logs in → 
   Validate credentials → 
   Generate access token (15 min) → 
   Generate refresh token (7 days) → 
   Store refresh token in httpOnly cookie → 
   Return tokens to client
   ```

3. **Token Refresh Flow**
   ```
   Access token expires → 
   Client sends refresh token → 
   Validate refresh token → 
   Generate new access token → 
   Optionally rotate refresh token → 
   Continue API calls
   ```

### API Endpoints

All authentication endpoints are under `/api/auth/`:

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/register` | POST | Create new account | No |
| `/api/auth/login` | POST | Login with email/password | No |
| `/api/auth/logout` | POST | Logout and invalidate tokens | Yes |
| `/api/auth/refresh` | POST | Get new access token | Refresh Token |
| `/api/auth/verify-email` | GET | Verify email with token | No |
| `/api/auth/forgot-password` | POST | Request password reset | No |
| `/api/auth/reset-password` | POST | Reset password with token | No |
| `/api/auth/me` | GET | Get current user info | Yes |
| `/api/auth/google` | GET | Start Google OAuth | No |
| `/api/auth/google/callback` | GET | Google OAuth callback | No |

---

## 🗄️ Database Management

### Schema Overview

The database uses PostgreSQL with Prisma ORM. Key models include:

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  emailVerified   Boolean   @default(false)
  passwordHash    String?
  firstName       String?
  lastName        String?
  role            Role      @default(USER)
  accounts        Account[]
  trades          Trade[]
  settings        Settings?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Account {
  id          String    @id @default(cuid())
  name        String
  type        AccountType
  currency    String    @default("USD")
  balance     Decimal   @db.Decimal(15, 2)
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  trades      Trade[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Trade {
  id          String    @id @default(cuid())
  symbol      String
  type        TradeType
  volume      Decimal   @db.Decimal(15, 8)
  openPrice   Decimal   @db.Decimal(15, 8)
  closePrice  Decimal?  @db.Decimal(15, 8)
  profit      Decimal?  @db.Decimal(15, 2)
  openTime    DateTime
  closeTime   DateTime?
  accountId   String
  account     Account   @relation(fields: [accountId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Common Database Tasks

```bash
# Navigate to backend directory
cd apps/backend

# View and edit data in browser
npx prisma studio

# Create a new migration after schema changes
npx prisma migrate dev --name descriptive_name

# Apply pending migrations (production)
npx prisma migrate deploy

# Reset database (WARNING: Deletes all data!)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate

# Seed database with sample data
npx prisma db seed
```

---

## 🧪 Testing

### Running Tests

```bash
# All tests
./maintain.sh test

# Backend tests only
cd apps/backend && npm test

# Frontend tests only
cd apps/web && npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Writing Tests

**Backend API Test Example:**
```javascript
const request = require('supertest');
const app = require('../../../index');

describe('POST /api/auth/login', () => {
  it('should return tokens for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });
});
```

**Frontend Component Test Example:**
```tsx
import { render, screen } from '@testing-library/react';
import TradeList from './TradeList';

describe('TradeList', () => {
  it('should display trades', () => {
    const trades = [
      { id: '1', symbol: 'EUR/USD', profit: 100 }
    ];
    
    render(<TradeList trades={trades} />);
    expect(screen.getByText('EUR/USD')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
  });
});
```

---

## 🐛 Troubleshooting Guide

### Common Issues & Solutions

#### Issue: "Cannot connect to database"
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list                # Mac

# Test connection
psql -U postgres -h localhost

# Fix: Update DATABASE_URL in .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/wealthlog"
```

#### Issue: "Port 5000/3000 already in use"
```bash
# Find process
lsof -i :5000           # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 <PID>           # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

#### Issue: "Module not found" errors
```bash
# Solution 1: Clean install
./maintain.sh clean
./maintain.sh install

# Solution 2: Clear caches
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
npm install
```

#### Issue: "Prisma client is outdated"
```bash
cd apps/backend
npx prisma generate
```

#### Issue: "Migration failed"
```bash
# Option 1: Reset (loses data)
npx prisma migrate reset

# Option 2: Create from current state
npx prisma db push
```

---

## 📝 Environment Variables

### Essential Variables (Required)

```env
# apps/backend/.env
DATABASE_URL="postgresql://user:pass@localhost:5432/wealthlog"
JWT_SECRET="minimum-32-character-secret-key-here"
JWT_REFRESH_SECRET="different-32-character-secret-key"

# apps/web/.env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

### Optional Services

```env
# Email (works without in dev)
RESEND_API_KEY="re_xxxxxxxxxxxx"

# OAuth (optional)
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxxxx"

# Trading platforms (optional)
BINANCE_API_KEY="xxxxx"
MT5_SYNC_TOKEN="xxxxx"
```

---

## 🚀 Deployment Checklist

### Before Deploying

- [ ] Run tests: `./maintain.sh test`
- [ ] Build locally: `./maintain.sh build`
- [ ] Check environment variables
- [ ] Update version in package.json
- [ ] Create git tag
- [ ] Update changelog

### Deployment Commands

```bash
# Backend (Render/Railway)
cd apps/backend
npm run build
npm run start

# Frontend (Vercel)
cd apps/web
npm run build
npm run start

# Docker
docker build -t wealthlog .
docker run -p 5000:5000 wealthlog
```

---

## 💡 Tips & Tricks

### Development Tips

1. **Use the maintain script**: It handles 90% of common tasks
2. **Check logs**: Backend logs are in `apps/backend/logs/`
3. **Use Prisma Studio**: Visual database editor at `npx prisma studio`
4. **Hot reload**: Both frontend and backend auto-reload on changes
5. **TypeScript**: Shared types in `packages/shared` prevent errors

### Performance Tips

1. **Database indexes**: Add indexes for frequently queried fields
2. **Pagination**: Use cursor-based pagination for large datasets
3. **Caching**: Redis caching for expensive queries
4. **Lazy loading**: Dynamic imports for large components
5. **Image optimization**: Use Next.js Image component

### Security Tips

1. **Never commit .env files**
2. **Use strong JWT secrets** (32+ characters)
3. **Validate all inputs** with Zod schemas
4. **Rate limit API endpoints**
5. **Keep dependencies updated**: `npm audit fix`

---

## 📚 Learning Resources

### Project-Specific Docs
- API Documentation: `/docs/api.md`
- Database Schema: `/docs/database.md`
- Architecture Decisions: `/docs/architecture.md`

### Technology Docs
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Prisma ORM Guide](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [TurboRepo Docs](https://turbo.build/repo/docs)

---

## 🆘 Getting Help

### Before Asking for Help
1. Check this README
2. Search existing issues
3. Try `./maintain.sh status`
4. Check logs in `apps/backend/logs/`
5. Google the error message

### Quick Commands When Stuck
```bash
# Check system status
./maintain.sh status

# Complete fresh start
./maintain.sh clean
./maintain.sh install
./maintain.sh migrate
./maintain.sh dev

# Reset database (WARNING: loses data)
cd apps/backend
npx prisma migrate reset
```

---

<p align="center">
  Happy Coding! 🚀
  <br><br>
  Remember: When in doubt, run <code>./maintain.sh clean && ./maintain.sh install</code>
</p>
