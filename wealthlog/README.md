# WealthLog - Personal Wealth Management Platform

A comprehensive financial management platform for tracking investments, trades, real estate, and personal wealth.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Git

### Setup After Cloning

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/wealthlog.git
cd wealthlog

# 2. Run initial setup
./maintain.sh setup

# 3. Configure your database
# Edit apps/backend/.env and update DATABASE_URL with your PostgreSQL connection string:
# DATABASE_URL="postgresql://username:password@localhost:5432/wealthlog?schema=public"

# 4. Run database migrations
./maintain.sh migrate

# 5. Start development servers
./maintain.sh dev
```

Your app will be running at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## 📁 Project Structure

```
wealthlog/
├── apps/
│   ├── backend/        # Express.js API server
│   ├── web/           # Next.js frontend
│   └── mobile/        # Capacitor mobile app (optional)
├── packages/
│   ├── shared/        # Shared utilities and types
│   └── ui/           # Shared UI components
├── maintain.sh        # Project maintenance script
└── turbo.json        # Turborepo configuration
```

## 🛠️ Maintenance Commands

### Understanding the Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `setup` | First-time project setup | After cloning from git |
| `install` | Clean installation (removes everything) | Major issues, dependency conflicts |
| `quick-install` | Fast fix without cleaning | Adding packages, minor issues |
| `build` | Production build | Before deployment |
| `dev` | Start dev servers | Daily development |
| `clean` | Remove all artifacts | Starting fresh |
| `migrate` | Database operations | Schema changes |
| `status` | Health check | Debugging issues |

### Common Workflows

#### 🆕 First Time Setup
```bash
./maintain.sh setup          # Creates env files, installs deps
# Edit DATABASE_URL in .env
./maintain.sh migrate         # Setup database
./maintain.sh dev            # Start development
```

#### 🔄 After Pulling Changes
```bash
git pull
./maintain.sh quick-install  # Update dependencies
./maintain.sh migrate         # Apply new migrations
./maintain.sh dev            # Start development
```

#### 🔧 When Things Break
```bash
./maintain.sh clean          # Remove everything
./maintain.sh install        # Fresh installation
./maintain.sh migrate        # Ensure DB is updated
./maintain.sh dev           # Start fresh
```

#### 📦 Adding New Packages
```bash
# Add to specific app
cd apps/backend
npm install package-name

# Then update all dependencies
./maintain.sh quick-install
```

## 🔐 Authentication Features

- JWT-based authentication (access + refresh tokens)
- Google OAuth integration
- Email verification system
- Password reset functionality
- Role-based access control
- Automatic token refresh

## 🌟 Key Features

- **Portfolio Management**: Track multiple financial accounts
- **Trading**: Monitor trades across FX, stocks, crypto
- **Real Estate**: Manage property investments
- **Expense Tracking**: Categorize and track expenses
- **Dashboard**: Comprehensive wealth overview
- **Multi-currency Support**: Handle international investments

## 📝 Environment Configuration

### Required Variables
```env
DATABASE_URL        # PostgreSQL connection string
```

### Pre-configured for Development
The setup script provides working defaults for:
- JWT secrets (secure for development)
- Google OAuth (configured for localhost)
- Session secrets
- API URLs

### Optional Services
```env
RESEND_API_KEY      # Email service (works without in dev)
REDIS_URL           # Redis cache (optional)
BINANCE_API_KEY     # Trading integration (optional)
MT5_SYNC_TOKEN      # MT5 trading platform (optional)
```

## 🚀 Deployment

### Backend (Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `cd apps/backend && npm install`
4. Set start command: `cd apps/backend && npm start`
5. Add environment variables from production .env

### Frontend (Vercel)
1. Import your GitHub repository to Vercel
2. Set root directory: `apps/web`
3. Set build command: `npm run build`
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Your Google OAuth ID

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check connection
./maintain.sh status

# Reset database (WARNING: deletes all data)
./maintain.sh migrate reset
```

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

### Dependency Issues
```bash
# Nuclear option - complete refresh
./maintain.sh clean
./maintain.sh install
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Rebuild
./maintain.sh build
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google` - Google OAuth login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password

### Protected Routes (Require Authentication)
All routes under `/api/*` require a valid JWT token:
- `/api/dashboard/*` - Dashboard data
- `/api/account/*` - Financial accounts
- `/api/transactions/*` - Transactions
- `/api/trade/*` - Trading data
- `/api/settings/*` - User settings

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Run `./maintain.sh status` to diagnose
3. Check logs in `apps/backend/logs/`
4. Open an issue on GitHub

---

Built with ❤️ using Next.js, Express, PostgreSQL, and Prisma
