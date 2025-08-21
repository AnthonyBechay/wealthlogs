# WealthLog - Personal Finance & Trading Management Platform

A comprehensive financial management system with trading analytics, real estate tracking, and automated portfolio management.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Git

### Setup in 3 Minutes

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/wealthlog.git
cd wealthlog

# 2. Initialize the project
./maintain.sh init

# 3. Update database connection in apps/backend/.env
# Edit DATABASE_URL with your PostgreSQL connection string

# 4. Setup database
./maintain.sh db:setup

# 5. Start development
./maintain.sh dev
```

**That's it!** 
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 🛠️ The Maintain Script - Your All-in-One Tool

The `maintain.sh` script is your single command center for everything. It's smart, intuitive, and handles all complexity for you.

### Essential Commands

| Command | What it does | When to use |
|---------|--------------|-------------|
| `./maintain.sh init` | First-time setup | After cloning the repo |
| `./maintain.sh dev` | Start development servers | Daily development |
| `./maintain.sh test` | Run all tests | Before committing |
| **`./maintain.sh deploy:check`** | **Pre-deployment validation** | **ALWAYS before pushing to production** |
| `./maintain.sh deploy:status` | Check production health | After deployment |

### Before Deploying to Production

**IMPORTANT:** Always run this before pushing to production:

```bash
./maintain.sh deploy:check
```

This command will:
- ✅ Validate your environment configuration
- ✅ Run all tests (warns on minor issues, fails on critical)
- ✅ Check for security issues
- ✅ Verify build process
- ✅ Show git status
- ✅ Tell you if you're ready to deploy

### Complete Command Reference

#### 🚀 Quick Start Commands
```bash
./maintain.sh init          # First-time setup
./maintain.sh dev           # Start development
./maintain.sh test          # Run test suite
./maintain.sh status        # Quick health check
```

#### 📦 Deployment Commands
```bash
./maintain.sh deploy:check  # IMPORTANT: Run before deploying
./maintain.sh deploy:status # Check production endpoints
./maintain.sh build         # Build for production
```

#### 🗄️ Database Commands
```bash
./maintain.sh db:setup      # Initial database setup
./maintain.sh db:migrate    # Run migrations
./maintain.sh db:reset      # Reset database (WARNING: deletes data)
```

#### 🔧 Maintenance Commands
```bash
./maintain.sh fix           # Auto-fix TypeScript errors
./maintain.sh clean         # Remove all build artifacts
./maintain.sh help          # Show detailed help
```

## 🚢 Deployment

### Automatic Deployment

**Your app deploys automatically when you push to Git!**

Both Render (backend) and Vercel (frontend) are connected to your Git repository. When you push to the master branch, they automatically deploy.

### Deployment Workflow

```bash
# 1. ALWAYS run pre-deployment check first
./maintain.sh deploy:check

# 2. If all checks pass, commit and push
git add .
git commit -m "Your feature/fix description"
git push origin master

# 3. Wait 2-3 minutes, then verify
./maintain.sh deploy:status
```

### Environment Variables

#### Backend (Render)
Set these in Render dashboard:
```env
DATABASE_URL=your-production-database-url
JWT_ACCESS_SECRET=generate-secure-random-string
JWT_REFRESH_SECRET=generate-secure-random-string
SESSION_SECRET=generate-secure-random-string
GOOGLE_CLIENT_ID=your-google-oauth-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
FRONTEND_URL=https://wealthlogs.com
ALLOWED_ORIGINS=https://wealthlogs.com
NODE_ENV=production
```

#### Frontend (Vercel)
Set these in Vercel dashboard:
```env
NEXT_PUBLIC_API_URL=https://wealthlog-backend-hx43.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-id
```

## 🏗️ Project Structure

```
wealthlog/
├── apps/
│   ├── backend/         # Express.js API server
│   │   ├── src/         # Source code
│   │   ├── prisma/      # Database schema
│   │   └── .env         # Backend environment variables
│   └── web/             # Next.js frontend
│       ├── pages/       # Application pages
│       ├── src/         # Components and utilities
│       └── .env.local   # Frontend environment variables
├── packages/
│   ├── shared/          # Shared types and utilities
│   └── ui/              # Shared UI components
├── maintain.sh          # 🎯 Your main tool for everything
└── package.json         # Root package configuration
```

## 🔥 Features

- **Trading Analytics**: Track trades, analyze patterns, calculate P&L
- **Account Management**: Multiple account types (FX, Stocks, Crypto, etc.)
- **Real Estate Tracking**: Property management and expense tracking
- **Authentication**: JWT-based auth with Google OAuth support
- **Dashboard**: Net worth tracking and financial overview
- **Secure**: Environment-based configuration, JWT tokens, secure sessions

## 🐛 Troubleshooting

### Something's not working?

1. **Try auto-fix first:**
   ```bash
   ./maintain.sh fix
   ```

2. **If that doesn't work, clean and reinstall:**
   ```bash
   ./maintain.sh clean
   ./maintain.sh init
   ```

3. **Check project status:**
   ```bash
   ./maintain.sh status
   ```

### Common Issues

| Issue | Solution |
|-------|----------|
| TypeScript errors | Run `./maintain.sh fix` |
| Build failures | Run `./maintain.sh clean` then `./maintain.sh init` |
| Database connection failed | Check DATABASE_URL in apps/backend/.env |
| Ports already in use | Kill processes on ports 3000 and 5000 |

## 📝 Development Workflow

### Daily Development
```bash
./maintain.sh dev
```

### Before Committing
```bash
./maintain.sh test
git add .
git commit -m "your changes"
```

### Before Deploying
```bash
./maintain.sh deploy:check  # ALWAYS run this
git push origin master       # Auto-deploys to production
```

## 🔒 Security Notes

- Never commit .env files
- Regenerate all secrets for production
- Use strong, unique passwords for database
- Enable 2FA on GitHub, Render, and Vercel accounts
- Review `./maintain.sh deploy:check` output for security warnings

## 📚 Additional Resources

- [Backend API Documentation](./apps/backend/README.md)
- [Frontend Documentation](./apps/web/README.md)
- [Database Schema](./apps/backend/prisma/schema.prisma)
- [Authentication Setup Guide](./docs/authentication.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Run `./maintain.sh test` before committing
4. Commit your changes
5. Push to the branch
6. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details

---

**Remember:** The `maintain.sh` script is your best friend. When in doubt, run:
```bash
./maintain.sh help
```

It handles all the complexity so you can focus on building features! 🚀
