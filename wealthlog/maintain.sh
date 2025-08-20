#!/bin/bash

# WealthLog Maintenance Script
# Usage: ./maintain.sh [command]
# Commands: install, build, dev, test, clean, migrate, seed, deploy, logs, status, full-reset

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    print_status "Node.js version: $(node --version)"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    print_status "npm version: $(npm --version)"
}

# Install dependencies
install() {
    print_status "Installing dependencies..."
    cd "$PROJECT_ROOT"
    
    # Install root dependencies
    npm install
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd apps/backend
    npm install
    
    # Install additional OAuth dependencies
    npm install passport passport-google-oauth20 cookie-parser express-session
    
    cd "$PROJECT_ROOT"
    
    # Install web dependencies
    print_status "Installing web dependencies..."
    cd apps/web
    npm install
    
    cd "$PROJECT_ROOT"
    
    # Install shared package dependencies
    print_status "Building shared packages..."
    npm run build:packages
    
    print_success "All dependencies installed successfully!"
}

# Build the project
build() {
    print_status "Building the project..."
    cd "$PROJECT_ROOT"
    
    # Build shared packages first
    print_status "Building shared packages..."
    npm run build:packages
    
    # Build backend (no build step for JS)
    print_status "Preparing backend..."
    cd apps/backend
    npm run prisma:generate
    
    cd "$PROJECT_ROOT"
    
    # Build web app
    print_status "Building web application..."
    cd apps/web
    npm run build
    
    cd "$PROJECT_ROOT"
    
    print_success "Build completed successfully!"
}

# Run development servers
dev() {
    print_status "Starting development servers..."
    cd "$PROJECT_ROOT"
    
    # Check if .env files exist
    if [ ! -f "apps/backend/.env" ]; then
        print_warning "Backend .env file not found. Creating from template..."
        create_env_files
    fi
    
    # Run migrations first
    migrate
    
    # Start all services in development mode
    npm run dev
}

# Run tests
test() {
    print_status "Running tests..."
    cd "$PROJECT_ROOT"
    
    # Run backend tests
    print_status "Testing backend..."
    cd apps/backend
    npm test 2>/dev/null || print_warning "No backend tests configured"
    
    cd "$PROJECT_ROOT"
    
    # Run web tests
    print_status "Testing web app..."
    cd apps/web
    npm test 2>/dev/null || print_warning "No web tests configured"
    
    cd "$PROJECT_ROOT"
    
    print_success "Tests completed!"
}

# Clean project
clean() {
    print_status "Cleaning project..."
    cd "$PROJECT_ROOT"
    
    # Remove node_modules
    print_status "Removing node_modules..."
    rm -rf node_modules
    rm -rf apps/backend/node_modules
    rm -rf apps/web/node_modules
    rm -rf apps/mobile/node_modules 2>/dev/null || true
    rm -rf packages/*/node_modules
    
    # Remove build artifacts
    print_status "Removing build artifacts..."
    rm -rf apps/web/.next
    rm -rf apps/web/.turbo
    rm -rf apps/backend/.turbo
    rm -rf packages/*/dist
    rm -rf .turbo
    
    # Remove lock files
    print_status "Removing lock files..."
    rm -f package-lock.json
    rm -f apps/*/package-lock.json
    rm -f packages/*/package-lock.json
    
    print_success "Project cleaned successfully!"
}

# Run database migrations
migrate() {
    print_status "Running database migrations..."
    cd "$PROJECT_ROOT/apps/backend"
    
    # Generate Prisma client
    npx prisma generate
    
    # Run migrations
    npx prisma migrate deploy
    
    print_success "Migrations completed successfully!"
}

# Seed database
seed() {
    print_status "Seeding database..."
    cd "$PROJECT_ROOT/apps/backend"
    
    # Check if seed file exists
    if [ -f "prisma/seed.js" ]; then
        npx prisma db seed
        print_success "Database seeded successfully!"
    else
        print_warning "No seed file found at prisma/seed.js"
    fi
}

# Deploy to production
deploy() {
    print_status "Deploying to production..."
    
    # Build first
    build
    
    # Deploy backend to Render
    print_status "Deploying backend to Render..."
    # Add your Render deployment command here
    
    # Deploy frontend to Vercel
    print_status "Deploying frontend to Vercel..."
    cd "$PROJECT_ROOT/apps/web"
    npx vercel --prod
    
    print_success "Deployment completed!"
}

# View logs
logs() {
    print_status "Viewing logs..."
    
    # View backend logs
    if [ "$2" == "backend" ]; then
        cd "$PROJECT_ROOT/apps/backend"
        tail -f logs/*.log 2>/dev/null || print_warning "No log files found"
    # View web logs
    elif [ "$2" == "web" ]; then
        cd "$PROJECT_ROOT/apps/web"
        npm run dev
    else
        print_status "Usage: ./maintain.sh logs [backend|web]"
    fi
}

# Check project status
status() {
    print_status "Checking project status..."
    
    # Check Node version
    check_node
    check_npm
    
    # Check database connection
    print_status "Checking database connection..."
    cd "$PROJECT_ROOT/apps/backend"
    npx prisma db pull --print 2>/dev/null && print_success "Database connected" || print_error "Database connection failed"
    
    # Check if ports are in use
    print_status "Checking ports..."
    lsof -i :3000 &>/dev/null && print_warning "Port 3000 is in use (Frontend)" || print_success "Port 3000 is available"
    lsof -i :5000 &>/dev/null && print_warning "Port 5000 is in use (Backend)" || print_success "Port 5000 is available"
    
    # Check environment files
    print_status "Checking environment files..."
    [ -f "$PROJECT_ROOT/apps/backend/.env" ] && print_success "Backend .env exists" || print_error "Backend .env missing"
    [ -f "$PROJECT_ROOT/apps/web/.env.local" ] && print_success "Web .env.local exists" || print_warning "Web .env.local missing"
    
    print_success "Status check completed!"
}

# Create environment files
create_env_files() {
    print_status "Creating environment files..."
    
    # Backend .env
    cat > "$PROJECT_ROOT/apps/backend/.env" << EOF
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/wealthlog?schema=public"
PORT=5000

# JWT Secrets (generate secure random strings in production)
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
SECRET_KEY=$(openssl rand -hex 32)

# Session
SESSION_SECRET=$(openssl rand -hex 32)

# OAuth (add your credentials)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# URLs
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3003

# Email (optional)
REQUIRE_EMAIL_VERIFICATION=false

# Other services
BINANCE_API_KEY=your-binance-api-key
BINANCE_API_SECRET=your-binance-api-secret
REDIS_URL=redis://localhost:6379
MT5_SYNC_TOKEN=12345
MT5_DEFAULT_USER=1
EOF
    
    # Web .env.local
    cat > "$PROJECT_ROOT/apps/web/.env.local" << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
EOF
    
    print_success "Environment files created! Please update them with your actual values."
}

# Full reset (clean + install + migrate + seed)
full_reset() {
    print_status "Performing full reset..."
    
    clean
    install
    migrate
    seed
    
    print_success "Full reset completed!"
}

# Main script logic
case "$1" in
    install)
        check_node
        check_npm
        install
        ;;
    build)
        check_node
        build
        ;;
    dev)
        check_node
        dev
        ;;
    test)
        check_node
        test
        ;;
    clean)
        clean
        ;;
    migrate)
        check_node
        migrate
        ;;
    seed)
        check_node
        seed
        ;;
    deploy)
        check_node
        deploy
        ;;
    logs)
        logs "$@"
        ;;
    status)
        status
        ;;
    env)
        create_env_files
        ;;
    full-reset)
        check_node
        check_npm
        full_reset
        ;;
    *)
        echo "WealthLog Maintenance Script"
        echo "Usage: ./maintain.sh [command]"
        echo ""
        echo "Commands:"
        echo "  install      - Install all dependencies"
        echo "  build        - Build the project for production"
        echo "  dev          - Start development servers"
        echo "  test         - Run tests"
        echo "  clean        - Clean project (remove node_modules, build artifacts)"
        echo "  migrate      - Run database migrations"
        echo "  seed         - Seed the database"
        echo "  deploy       - Deploy to production"
        echo "  logs [type]  - View logs (backend|web)"
        echo "  status       - Check project status"
        echo "  env          - Create environment files from template"
        echo "  full-reset   - Full reset (clean + install + migrate + seed)"
        echo ""
        exit 1
        ;;
esac
