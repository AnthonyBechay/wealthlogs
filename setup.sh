#!/bin/bash
# Simple setup script for WealthLog

echo "🚀 WealthLog Setup Script"
echo "========================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) and npm $(npm -v) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Install concurrently if not already installed
if ! npm list concurrently &> /dev/null; then
    echo "📦 Installing concurrently..."
    npm install --save-dev concurrently
fi

# Build shared package
echo ""
echo "🔨 Building shared package..."
cd wealthlogs-code/packages/shared
npm run build 2>/dev/null || npm run compile 2>/dev/null || npx tsc
if [ $? -eq 0 ]; then
    print_success "Shared package built"
else
    print_warning "Shared package build failed (might not be critical)"
fi
cd ../../..

# Create environment files if they don't exist
echo ""
echo "📝 Setting up environment files..."

# Backend .env
if [ ! -f wealthlogs-code/apps/backend/.env ]; then
    cat > wealthlogs-code/apps/backend/.env << EOF
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://abechay:12345678@localhost:5432/wealthlog
JWT_ACCESS_SECRET=your-access-secret-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this
SECRET_KEY=your-secret-key-change-this
SESSION_SECRET=your-session-secret-change-this
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
EOF
    print_success "Backend .env created (Please update with your database credentials)"
else
    print_success "Backend .env already exists"
fi

# Frontend .env.local
if [ ! -f wealthlogs-code/apps/web/.env.local ]; then
    cat > wealthlogs-code/apps/web/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
EOF
    print_success "Frontend .env.local created"
else
    print_success "Frontend .env.local already exists"
fi

# Check database connection
echo ""
echo "🗄️  Checking database connection..."
cd wealthlogs-code/apps/backend
npx prisma db push --skip-generate 2>/dev/null
if [ $? -eq 0 ]; then
    print_success "Database connected and schema synced"
else
    print_warning "Database connection failed. Please check your DATABASE_URL in backend/.env"
    echo "   Make sure PostgreSQL is running and the database 'wealthlog' exists"
fi
cd ../../..

echo ""
echo "✨ Setup complete!"
echo ""
echo "To start the development servers, run:"
echo "  npm run dev"
echo ""
echo "Available commands:"
echo "  npm run dev          - Start both backend and frontend"
echo "  npm run dev:web      - Start frontend only"
echo "  npm run dev:backend  - Start backend only"
echo "  npm run build        - Build all packages"
echo "  npm run db:studio    - Open Prisma Studio"
echo "  npm run clean        - Clean all build artifacts"
echo "  npm run fresh        - Clean and reinstall everything"
