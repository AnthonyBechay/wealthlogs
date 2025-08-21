#!/bin/bash

# WealthLog Maintenance Script
# Usage: ./maintain.sh [command]
# Commands: setup, install, quick-install, build, dev, clean, migrate, deploy, status, help

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
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

print_section() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}========================================${NC}\n"
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

# SETUP: First-time setup after cloning from git
setup() {
    print_section "FIRST-TIME PROJECT SETUP"
    print_status "Setting up WealthLog for the first time..."
    
    check_node
    check_npm
    
    # Create environment files
    print_status "Creating environment files..."
    create_env_files
    
    # Install all dependencies
    print_status "Installing all dependencies..."
    quick_install
    
    # Setup database
    print_status "Setting up database..."
    cd "$PROJECT_ROOT/apps/backend"
    npx prisma generate
    
    print_warning "Please update the DATABASE_URL in apps/backend/.env with your PostgreSQL connection string"
    print_warning "Then run: ./maintain.sh migrate"
    
    print_success "Initial setup complete!"
    print_status "Next steps:"
    echo "  1. Update apps/backend/.env with your database connection"
    echo "  2. Run: ./maintain.sh migrate"
    echo "  3. Run: ./maintain.sh dev"
}

# INSTALL: Clean installation (removes everything and reinstalls)
install() {
    print_section "CLEAN INSTALLATION"
    print_status "This will remove all node_modules and reinstall everything fresh."
    print_status "Use this when you have dependency conflicts or want a fresh start."
    
    cd "$PROJECT_ROOT"
    
    # Clean first
    clean
    
    # Install root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd apps/backend
    npm install
    npm install passport passport-google-oauth20 cookie-parser express-session resend
    
    cd "$PROJECT_ROOT"
    
    # Install web dependencies
    print_status "Installing web dependencies..."
    cd apps/web
    npm install
    
    cd "$PROJECT_ROOT"
    
    # Build shared packages
    if [ -d "packages/shared" ]; then
        print_status "Building shared package..."
        cd packages/shared
        npm install
        npm run build || print_warning "Shared package build failed (TypeScript might not be configured)"
        cd "$PROJECT_ROOT"
    fi
    
    print_success "Clean installation completed!"
}

# QUICK-INSTALL: Fast installation without cleaning (fixes most issues)
quick_install() {
    print_section "QUICK INSTALLATION"
    print_status "Installing/updating dependencies without cleaning."
    print_status "Use this for quick fixes or updating dependencies."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies with force flag to resolve conflicts
    print_status "Installing root dependencies..."
    npm install --force
    
    print_status "Installing backend dependencies..."
    cd apps/backend
    npm install --force
    npm install passport passport-google-oauth20 cookie-parser express-session resend
    
    print_status "Installing web dependencies..."
    cd ../web
    npm install --force
    
    cd "$PROJECT_ROOT"
    
    print_success "Quick installation completed!"
}

# BUILD: Build the project for production
build() {
    print_section "PRODUCTION BUILD"
    print_status "Building the project for production deployment."
    
    cd "$PROJECT_ROOT"
    
    # Build shared packages first
    if [ -d "packages/shared" ]; then
        print_status "Building shared package..."
        cd packages/shared
        npm run build || print_warning "Shared package build skipped"
        cd "$PROJECT_ROOT"
    fi
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    cd apps/backend
    npx prisma generate
    
    cd "$PROJECT_ROOT"
    
    # Build web app
    print_status "Building web application..."
    cd apps/web
    npm run build
    
    cd "$PROJECT_ROOT"
    
    print_success "Production build completed!"
}

# DEV: Run development servers
dev() {
    print_section "DEVELOPMENT MODE"
    print_status "Starting development servers..."
    print_status "Backend will run on: http://localhost:5000"
    print_status "Frontend will run on: http://localhost:3000"
    
    cd "$PROJECT_ROOT"
    
    # Check if .env files exist
    if [ ! -f "apps/backend/.env" ]; then
        print_error "Backend .env file not found!"
        print_warning "Run './maintain.sh setup' first"
        exit 1
    fi
    
    # Check database
    print_status "Checking database connection..."
    cd apps/backend
    npx prisma generate
    npx prisma migrate deploy || print_warning "Database not migrated. Run: ./maintain.sh migrate"
    
    cd "$PROJECT_ROOT"
    
    # Start services
    if command -v turbo &> /dev/null; then
        npm run dev
    else
        print_warning "Starting services without Turbo..."
        cd apps/backend
        npm run dev &
        BACKEND_PID=$!
        
        cd ../web
        npm run dev &
        FRONTEND_PID=$!
        
        print_status "Backend PID: $BACKEND_PID"
        print_status "Frontend PID: $FRONTEND_PID"
        print_status "Press Ctrl+C to stop all services"
        
        wait
    fi
}

# CLEAN: Remove all generated files and dependencies
clean() {
    print_section "CLEANING PROJECT"
    print_status "Removing all node_modules, build artifacts, and lock files..."
    
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

# MIGRATE: Run database migrations
migrate() {
    print_section "DATABASE MIGRATION"
    print_status "Running database migrations..."
    
    cd "$PROJECT_ROOT/apps/backend"
    
    # Generate Prisma client
    npx prisma generate
    
    # Create migration if specified
    if [ "$2" == "create" ]; then
        print_status "Creating new migration: ${3:-migration}"
        npx prisma migrate dev --name ${3:-"migration"}
    elif [ "$2" == "reset" ]; then
        print_warning "This will DELETE all data in your database!"
        read -p "Are you sure? (y/N): " confirm
        if [ "$confirm" == "y" ] || [ "$confirm" == "Y" ]; then
            npx prisma migrate reset
        fi
    else
        # Run pending migrations
        npx prisma migrate deploy
    fi
    
    print_success "Migration completed!"
}

# STATUS: Check project status
status() {
    print_section "PROJECT STATUS CHECK"
    
    # Check Node version
    check_node
    check_npm
    
    # Check environment files
    print_status "Checking environment files..."
    [ -f "$PROJECT_ROOT/apps/backend/.env" ] && print_success "✓ Backend .env exists" || print_error "✗ Backend .env missing"
    [ -f "$PROJECT_ROOT/apps/web/.env.local" ] && print_success "✓ Web .env.local exists" || print_warning "✗ Web .env.local missing (optional)"
    
    # Check package installations
    print_status "Checking package installations..."
    [ -d "$PROJECT_ROOT/node_modules" ] && print_success "✓ Root packages installed" || print_error "✗ Root packages not installed"
    [ -d "$PROJECT_ROOT/apps/backend/node_modules" ] && print_success "✓ Backend packages installed" || print_error "✗ Backend packages not installed"
    [ -d "$PROJECT_ROOT/apps/web/node_modules" ] && print_success "✓ Web packages installed" || print_error "✗ Web packages not installed"
    
    # Check database connection
    print_status "Checking database connection..."
    cd "$PROJECT_ROOT/apps/backend"
    npx prisma db pull --print &>/dev/null && print_success "✓ Database connected" || print_error "✗ Database connection failed"
    
    # Check ports
    print_status "Checking ports..."
    if command -v netstat &> /dev/null; then
        netstat -an | grep -q ":3000 " && print_warning "⚠ Port 3000 is in use" || print_success "✓ Port 3000 available"
        netstat -an | grep -q ":5000 " && print_warning "⚠ Port 5000 is in use" || print_success "✓ Port 5000 available"
    fi
    
    cd "$PROJECT_ROOT"
    print_success "Status check completed!"
}

# CREATE ENV FILES: Generate environment file templates
create_env_files() {
    print_status "Creating environment file templates..."
    
    # Backend .env - includes non-machine-specific defaults
    cat > "$PROJECT_ROOT/apps/backend/.env" << 'EOF'
# Environment
NODE_ENV=development
PORT=5000

# Database - UPDATE THIS WITH YOUR POSTGRESQL CONNECTION
DATABASE_URL="postgresql://username:password@localhost:5432/wealthlog?schema=public"

# JWT Secrets - These are secure for development, regenerate for production
JWT_ACCESS_SECRET=d91754034e088dad31bc89e38cee37219b6ffb64e88183e057fdce0e045386b2
JWT_REFRESH_SECRET=3045b54d89ab7602197613e62308c21a80b9c4f966e461960298522bfe5206a0
SECRET_KEY=fe6f035d4d41fd58f4f3a8fe18849f7e35140b48e5236966afa7c1024d3d733e

# Session Secret
SESSION_SECRET=9fdb36952bd8087a8172eb720532bcbd2f92d7f786723400df106d9d91da8c6b

# Google OAuth - These work for localhost development
GOOGLE_CLIENT_ID=727664342527-5s1fulpdmld3a1e2vg424k28oktugkpp.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# URLs
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3003

# Email Service (Optional - works without configuration in dev mode)
EMAIL_SERVICE=resend
RESEND_API_KEY=your-resend-api-key-optional
FROM_EMAIL=noreply@wealthlog.com
REQUIRE_EMAIL_VERIFICATION=false

# Redis (Optional - only if you have Redis installed)
REDIS_URL=redis://localhost:6379

# Trading Services (Optional)
MT5_SYNC_TOKEN=12345
MT5_DEFAULT_USER=1
BINANCE_API_KEY=your-binance-api-key-optional
BINANCE_API_SECRET=your-binance-api-secret-optional
EOF
    
    # Web .env.local
    cat > "$PROJECT_ROOT/apps/web/.env.local" << 'EOF'
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000

# Google OAuth Client ID (same as backend)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=727664342527-5s1fulpdmld3a1e2vg424k28oktugkpp.apps.googleusercontent.com
EOF
    
    print_success "Environment files created!"
    print_warning "IMPORTANT: Update DATABASE_URL in apps/backend/.env with your PostgreSQL connection"
}

# DEPLOY: Deploy to production
deploy() {
    print_section "PRODUCTION DEPLOYMENT"
    print_status "Preparing for production deployment..."
    
    # Build first
    build
    
    print_status "Ready for deployment!"
    print_status "Deploy backend to Render: https://render.com"
    print_status "Deploy frontend to Vercel: Run 'vercel --prod' in apps/web"
    
    print_warning "Remember to set production environment variables!"
}

# HELP: Show detailed help information
show_help() {
    echo -e "${MAGENTA}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              WealthLog Maintenance Script Help              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${CYAN}COMMANDS:${NC}"
    echo ""
    
    echo -e "${GREEN}setup${NC}          - First-time setup after cloning from git"
    echo "                 Creates env files, installs dependencies, prepares database"
    echo ""
    
    echo -e "${GREEN}install${NC}        - Clean installation (removes & reinstalls everything)"
    echo "                 Use when: Major dependency issues, switching branches"
    echo ""
    
    echo -e "${GREEN}quick-install${NC}  - Fast installation without cleaning"
    echo "                 Use when: Adding new packages, fixing minor issues"
    echo ""
    
    echo -e "${GREEN}build${NC}          - Build project for production"
    echo "                 Creates optimized production builds"
    echo ""
    
    echo -e "${GREEN}dev${NC}            - Start development servers"
    echo "                 Backend: http://localhost:5000"
    echo "                 Frontend: http://localhost:3000"
    echo ""
    
    echo -e "${GREEN}clean${NC}          - Remove all build artifacts & dependencies"
    echo "                 Cleans node_modules, build files, lock files"
    echo ""
    
    echo -e "${GREEN}migrate${NC}        - Run database migrations"
    echo "  migrate create [name] - Create new migration"
    echo "  migrate reset        - Reset database (WARNING: deletes data)"
    echo ""
    
    echo -e "${GREEN}status${NC}         - Check project health"
    echo "                 Verifies installation, database, ports"
    echo ""
    
    echo -e "${GREEN}deploy${NC}         - Prepare for production deployment"
    echo ""
    
    echo -e "${CYAN}TYPICAL WORKFLOWS:${NC}"
    echo ""
    echo -e "${YELLOW}After cloning from git:${NC}"
    echo "  1. ./maintain.sh setup"
    echo "  2. Update DATABASE_URL in apps/backend/.env"
    echo "  3. ./maintain.sh migrate"
    echo "  4. ./maintain.sh dev"
    echo ""
    echo -e "${YELLOW}Daily development:${NC}"
    echo "  ./maintain.sh dev"
    echo ""
    echo -e "${YELLOW}After pulling changes:${NC}"
    echo "  1. ./maintain.sh quick-install"
    echo "  2. ./maintain.sh migrate"
    echo "  3. ./maintain.sh dev"
    echo ""
    echo -e "${YELLOW}When things break:${NC}"
    echo "  1. ./maintain.sh clean"
    echo "  2. ./maintain.sh install"
    echo "  3. ./maintain.sh migrate"
    echo ""
}

# Main script logic
case "$1" in
    setup)
        setup
        ;;
    install)
        check_node
        check_npm
        install
        ;;
    quick-install)
        check_node
        check_npm
        quick_install
        ;;
    build)
        check_node
        build
        ;;
    dev)
        check_node
        dev
        ;;
    clean)
        clean
        ;;
    migrate)
        check_node
        migrate "$@"
        ;;
    deploy)
        check_node
        deploy
        ;;
    status)
        status
        ;;
    env)
        create_env_files
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
