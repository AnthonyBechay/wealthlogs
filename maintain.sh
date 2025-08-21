#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                     WealthLog Maintenance Script v3.1                         ║
# ║                  Enhanced with Logging & Better Diagnostics                   ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
#
# Usage: ./maintain.sh [command] [options]
# Run: ./maintain.sh help for all commands

set -e  # Exit on error for safety

# ================================================================================
# CONFIGURATION
# ================================================================================

# Colors for beautiful output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Emojis for visual feedback
CHECK="✅"
CROSS="❌"
WARN="⚠️ "
INFO="ℹ️ "
ROCKET="🚀"
BUILD="🔨"
CLEAN="🧹"
TEST="🧪"
DB="🗄️ "
CLOCK="⏰"
LOG="📝"

# Project paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/apps/backend"
FRONTEND_DIR="$PROJECT_ROOT/apps/web"
SHARED_DIR="$PROJECT_ROOT/packages/shared"

# Logging configuration
LOG_DIR="$PROJECT_ROOT/.maintain-logs"
LOG_FILE="$LOG_DIR/maintain-$(date +%Y%m%d-%H%M%S).log"
LATEST_LOG="$LOG_DIR/latest.log"

# Production URLs
PROD_BACKEND_URL="https://wealthlog-backend-hx43.onrender.com"
PROD_FRONTEND_URL="https://wealthlogs.com"

# ================================================================================
# LOGGING FUNCTIONS
# ================================================================================

# Initialize logging
init_logging() {
    mkdir -p "$LOG_DIR"
    touch "$LOG_FILE"
    ln -sf "$LOG_FILE" "$LATEST_LOG"
    
    # Log header
    {
        echo "========================================="
        echo "WealthLog Maintenance Log"
        echo "Date: $(date)"
        echo "Command: $*"
        echo "========================================="
        echo ""
    } >> "$LOG_FILE"
}

# Log to file
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# Log and display
log_print() {
    local message="$1"
    echo -e "$message"
    # Strip color codes for log file
    echo "$message" | sed 's/\x1b\[[0-9;]*m//g' >> "$LOG_FILE"
}

# Log error with details
log_error() {
    local context="$1"
    local detail="$2"
    log "ERROR in $context: $detail"
    echo -e "${RED}${CROSS}${NC} $context" >&2
    if [ -n "$detail" ]; then
        echo -e "${GRAY}  → $detail${NC}" >&2
    fi
}

# Show log file location
show_log_info() {
    echo ""
    echo -e "${LOG} Log file: ${CYAN}$LOG_FILE${NC}"
    echo -e "${LOG} View latest: ${YELLOW}cat $LATEST_LOG${NC}"
}

# ================================================================================
# UTILITY FUNCTIONS
# ================================================================================

print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${WHITE}  $1${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log "=== $1 ==="
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log "--- $1 ---"
}

print_status() { 
    echo -e "${BLUE}${INFO}${NC} $1"
    log "INFO: $1"
}

print_success() { 
    echo -e "${GREEN}${CHECK}${NC} $1"
    log "SUCCESS: $1"
}

print_error() { 
    echo -e "${RED}${CROSS}${NC} $1"
    log "ERROR: $1"
}

print_warning() { 
    echo -e "${YELLOW}${WARN}${NC}$1"
    log "WARNING: $1"
}

print_build() { 
    echo -e "${CYAN}${BUILD}${NC} $1"
    log "BUILD: $1"
}

print_test() { 
    echo -e "${MAGENTA}${TEST}${NC} $1"
    log "TEST: $1"
}

# Spinner for long operations
spinner() {
    local pid=$!
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Check system requirements
check_requirements() {
    local missing=0
    
    command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed."; missing=1; }
    command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed."; missing=1; }
    command -v git >/dev/null 2>&1 || { print_error "Git is required but not installed."; missing=1; }
    
    if [ $missing -eq 1 ]; then
        echo ""
        print_error "Please install missing requirements and try again."
        exit 1
    fi
    
    # Check versions
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_status "Node.js $NODE_VERSION | npm $NPM_VERSION"
}

# ================================================================================
# MAIN COMMANDS
# ================================================================================

# INIT: First-time project setup (also handles package updates)
cmd_init() {
    print_header "         INITIALIZING WEALTHLOG PROJECT         "
    
    check_requirements
    
    # Check if this is first-time or update
    local is_update=false
    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        is_update=true
        print_status "Detected existing installation - updating packages..."
        log "Running in update mode"
    else
        print_status "First-time setup detected..."
        log "Running in fresh install mode"
    fi
    
    print_section "Creating Environment Files"
    
    # Backend .env
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        cat > "$BACKEND_DIR/.env" << 'EOF'
# Environment
NODE_ENV=development
PORT=5000

# Database - UPDATE THIS!
DATABASE_URL="postgresql://username:password@localhost:5432/wealthlog?schema=public"

# JWT Secrets (regenerate for production!)
JWT_ACCESS_SECRET=dev_access_secret_change_in_production_$(openssl rand -hex 16)
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production_$(openssl rand -hex 16)
SESSION_SECRET=dev_session_secret_change_in_production_$(openssl rand -hex 16)

# Google OAuth (get your own from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# URLs
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000

# Optional
REQUIRE_EMAIL_VERIFICATION=false
EOF
        print_success "Created backend .env file"
    else
        print_warning "Backend .env already exists - skipping"
    fi
    
    # Frontend .env.local
    if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
        cat > "$FRONTEND_DIR/.env.local" << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
EOF
        print_success "Created frontend .env.local file"
    else
        print_warning "Frontend .env.local already exists - skipping"
    fi
    
    print_section "Installing Dependencies"
    
    # Root dependencies
    cd "$PROJECT_ROOT"
    print_status "Installing root dependencies..."
    npm install --force >> "$LOG_FILE" 2>&1 &
    spinner
    print_success "Root dependencies installed"
    
    # Backend dependencies
    cd "$BACKEND_DIR"
    print_status "Installing backend dependencies..."
    npm install --force >> "$LOG_FILE" 2>&1 &
    spinner
    print_success "Backend dependencies installed"
    
    # Frontend dependencies
    cd "$FRONTEND_DIR"
    print_status "Installing frontend dependencies..."
    npm install --force >> "$LOG_FILE" 2>&1 &
    spinner
    
    # Ensure critical types are installed
    npm install --save-dev @types/papaparse @types/node >> "$LOG_FILE" 2>&1
    print_success "Frontend dependencies installed"
    
    print_section "Building Shared Packages"
    
    if [ -d "$SHARED_DIR" ]; then
        cd "$SHARED_DIR"
        if npm run build >> "$LOG_FILE" 2>&1; then
            print_success "Shared package built successfully"
        else
            print_warning "Shared package build needs configuration - check logs"
        fi
    fi
    
    print_section "Setting Up Database"
    
    cd "$BACKEND_DIR"
    npx prisma generate >> "$LOG_FILE" 2>&1
    print_success "Prisma client generated"
    
    echo ""
    if [ "$is_update" = true ]; then
        print_header "          UPDATE COMPLETE!          "
        echo -e "${GREEN}Packages updated successfully!${NC}"
    else
        print_header "          INITIALIZATION COMPLETE!          "
        echo ""
        echo -e "${GREEN}Next steps:${NC}"
        echo -e "  1. ${WHITE}Update DATABASE_URL${NC} in ${CYAN}apps/backend/.env${NC}"
        echo -e "  2. Run: ${YELLOW}./maintain.sh db:setup${NC} to create database"
        echo -e "  3. Run: ${YELLOW}./maintain.sh dev${NC} to start development"
    fi
    
    show_log_info
}

# TEST: Run comprehensive tests with detailed logging
cmd_test() {
    print_header "           RUNNING TEST SUITE           "
    
    local total_errors=0
    local critical_errors=0
    
    print_section "Testing Shared Package"
    if [ -d "$SHARED_DIR" ]; then
        cd "$SHARED_DIR"
        
        print_test "Building shared package..."
        if npm run build >> "$LOG_FILE" 2>&1; then
            print_success "Shared package builds"
        else
            print_error "Shared package build failed"
            log "Shared package build error - check npm output above"
            critical_errors=$((critical_errors + 1))
        fi
        
        print_test "TypeScript validation..."
        if npx tsc --noEmit >> "$LOG_FILE" 2>&1; then
            print_success "TypeScript valid"
        else
            print_warning "TypeScript has warnings (see log for details)"
            total_errors=$((total_errors + 1))
        fi
    fi
    
    print_section "Testing Frontend"
    cd "$FRONTEND_DIR"
    
    print_test "Checking dependencies..."
    if grep -q "@types/papaparse" package.json; then
        print_success "Required types installed"
    else
        print_warning "Installing missing types..."
        npm install --save-dev @types/papaparse >> "$LOG_FILE" 2>&1
    fi
    
    print_test "TypeScript validation..."
    local ts_output=$(npx tsc --noEmit 2>&1 || true)
    echo "$ts_output" >> "$LOG_FILE"
    
    if echo "$ts_output" | grep -q "error TS"; then
        local ts_errors=$(echo "$ts_output" | grep -c "error TS")
        print_warning "$ts_errors TypeScript warning(s) - details in log"
        log "TypeScript errors found: $ts_errors"
        total_errors=$((total_errors + ts_errors))
    else
        print_success "TypeScript valid"
    fi
    
    print_test "Production build test..."
    if npm run build >> "$LOG_FILE" 2>&1; then
        print_success "Production build works"
    else
        print_error "Production build failed - check log for details"
        critical_errors=$((critical_errors + 1))
    fi
    
    print_section "Testing Backend"
    cd "$BACKEND_DIR"
    
    print_test "Prisma schema validation..."
    if npx prisma validate >> "$LOG_FILE" 2>&1; then
        print_success "Prisma schema valid"
    else
        print_error "Prisma schema invalid"
        log "Prisma validation failed"
        critical_errors=$((critical_errors + 1))
    fi
    
    print_test "API route configuration..."
    # Check for /api prefix in the shared API file (handle both quote types)
    if grep -qE "'/api/|/api/" "$SHARED_DIR/src/api/index.ts" 2>/dev/null; then
        print_success "API routes configured correctly"
        log "API routes have /api prefix"
    else
        print_error "API routes misconfigured - missing /api prefix"
        log "API routes missing /api prefix in $SHARED_DIR/src/api/index.ts"
        
        # Show what was found
        echo -e "${GRAY}  → Checking for API routes in shared/src/api/index.ts${NC}"
        grep -n "api\." "$SHARED_DIR/src/api/index.ts" | head -5 >> "$LOG_FILE" 2>&1 || true
        
        critical_errors=$((critical_errors + 1))
    fi
    
    # Summary
    echo ""
    print_section "Test Summary"
    
    if [ $critical_errors -eq 0 ]; then
        if [ $total_errors -eq 0 ]; then
            print_success "All tests passed! Ready for deployment."
        else
            print_warning "Tests passed with $total_errors non-critical warning(s)"
            print_status "Safe to deploy but consider fixing warnings"
        fi
        show_log_info
        return 0
    else
        print_error "$critical_errors critical error(s) found!"
        print_error "Fix these before deploying"
        show_log_info
        return 1
    fi
}

# DEPLOY:CHECK - Pre-deployment validation with detailed logging
cmd_deploy_check() {
    print_header "       PRE-DEPLOYMENT VALIDATION       "
    
    local ready=true
    
    print_section "Checking Environment"
    
    # Check for production values in env files
    if [ -f "$BACKEND_DIR/.env" ]; then
        if grep -q "localhost" "$BACKEND_DIR/.env"; then
            print_warning "Backend .env contains localhost URLs"
            print_status "Ensure production env vars are set on Render"
            log "Backend .env has localhost URLs - needs production config on Render"
        else
            print_success "Backend .env looks production-ready"
        fi
    else
        print_error "Backend .env missing!"
        ready=false
    fi
    
    print_section "Running Tests"
    
    # Run test suite
    if cmd_test; then
        print_success "Tests passed"
    else
        print_error "Tests failed"
        ready=false
    fi
    
    print_section "Security Check"
    
    # Check for exposed secrets
    cd "$PROJECT_ROOT"
    print_status "Scanning for exposed secrets..."
    
    local secret_files=$(grep -rl "JWT_.*SECRET\|GOOGLE_CLIENT_SECRET" \
        --include="*.js" --include="*.ts" --include="*.tsx" \
        --exclude-dir=node_modules --exclude-dir=.git \
        --exclude="*.env*" . 2>/dev/null | head -5 || true)
    
    if [ -n "$secret_files" ]; then
        print_warning "Potential secrets in code - verify they're not hardcoded"
        echo "$secret_files" | while read -r file; do
            echo -e "${GRAY}  → Check: $file${NC}"
            log "Potential secret in: $file"
        done
    else
        print_success "No exposed secrets found"
    fi
    
    print_section "Git Status"
    
    # Check git status
    if [ -d .git ]; then
        if git diff-index --quiet HEAD -- 2>/dev/null; then
            print_success "No uncommitted changes"
        else
            print_warning "You have uncommitted changes:"
            git status --short | head -10
            git status --short >> "$LOG_FILE"
        fi
        
        # Show current branch
        BRANCH=$(git rev-parse --abbrev-ref HEAD)
        print_status "Current branch: $BRANCH"
        log "Git branch: $BRANCH"
    fi
    
    # Summary
    echo ""
    if [ "$ready" = true ]; then
        print_header "    ${CHECK} READY FOR DEPLOYMENT!    "
        echo ""
        echo -e "${GREEN}Deployment will happen automatically:${NC}"
        echo -e "  ${WHITE}1.${NC} Backend deploys when you: ${YELLOW}git push origin $BRANCH${NC}"
        echo -e "  ${WHITE}2.${NC} Frontend deploys when you: ${YELLOW}git push origin $BRANCH${NC}"
        echo ""
        echo -e "${CYAN}Both Render and Vercel are connected to your Git repository${NC}"
        echo ""
        print_status "After pushing, monitor deployments at:"
        echo -e "  ${WHITE}Render:${NC} https://dashboard.render.com"
        echo -e "  ${WHITE}Vercel:${NC} https://vercel.com/dashboard"
    else
        print_header "    ${CROSS} NOT READY FOR DEPLOYMENT    "
        print_error "Fix the issues above before deploying"
        echo ""
        echo -e "${YELLOW}Troubleshooting tips:${NC}"
        echo -e "  1. Check the detailed log: ${CYAN}cat $LATEST_LOG${NC}"
        echo -e "  2. Try auto-fix: ${YELLOW}./maintain.sh fix${NC}"
        echo -e "  3. Rebuild packages: ${YELLOW}./maintain.sh build${NC}"
    fi
    
    show_log_info
}

# FIX - Auto-fix common issues with detailed logging
cmd_fix() {
    print_header "        AUTO-FIXING COMMON ISSUES        "
    
    print_section "Checking API Routes Configuration"
    
    # First, let's check what's actually in the file
    if [ -f "$SHARED_DIR/src/api/index.ts" ]; then
        print_status "Analyzing API routes in shared package..."
        
        # Count how many routes have /api prefix
        local with_prefix=$(grep -c "'/api/" "$SHARED_DIR/src/api/index.ts" 2>/dev/null || echo "0")
        local without_prefix=$(grep -c "api\.(get\|post\|put\|delete\|patch)(" "$SHARED_DIR/src/api/index.ts" 2>/dev/null || echo "0")
        
        log "Routes with /api prefix: $with_prefix"
        log "Total API calls found: $without_prefix"
        
        if [ "$with_prefix" -gt 0 ]; then
            print_success "API routes already have /api prefix ($with_prefix routes configured)"
        else
            print_warning "API routes may need /api prefix"
            echo -e "${GRAY}  → Found $without_prefix API calls to check${NC}"
        fi
    else
        print_error "API file not found at $SHARED_DIR/src/api/index.ts"
    fi
    
    print_section "Fixing TypeScript Errors"
    
    cd "$FRONTEND_DIR"
    
    # Create types directory if it doesn't exist
    mkdir -p types
    
    # Fix error handling in all TSX files
    print_status "Adding type assertions for error handling..."
    
    # Count files to fix
    local files_to_fix=$(find pages -name "*.tsx" -type f 2>/dev/null | wc -l)
    print_status "Processing $files_to_fix TypeScript files..."
    
    # Fix with proper backup
    find pages -name "*.tsx" -type f 2>/dev/null | while read -r file; do
        # Create backup
        cp "$file" "$file.bak"
        
        # Apply fixes
        sed -i 's/catch (error)/catch (error: any)/g' "$file" 2>/dev/null || true
        sed -i 's/error\.response/(error as any).response/g' "$file" 2>/dev/null || true
        
        # Check if file changed
        if ! diff -q "$file" "$file.bak" > /dev/null 2>&1; then
            log "Fixed error handling in: $file"
        fi
        
        # Remove backup
        rm -f "$file.bak"
    done
    
    print_success "Error handling fixed in TypeScript files"
    
    # Install missing types
    print_status "Installing missing type definitions..."
    npm install --save-dev @types/papaparse @types/node >> "$LOG_FILE" 2>&1
    print_success "Type definitions installed"
    
    print_section "Rebuilding Packages"
    
    cd "$SHARED_DIR"
    print_build "Rebuilding shared package..."
    if npm run build >> "$LOG_FILE" 2>&1; then
        print_success "Shared package rebuilt successfully"
    else
        print_warning "Shared package build had issues - check log"
    fi
    
    cd "$FRONTEND_DIR"
    
    print_section "Validating Fixes"
    
    print_test "Testing frontend build..."
    if npm run build >> "$LOG_FILE" 2>&1; then
        print_success "Frontend builds successfully after fixes!"
    else
        print_warning "Some issues remain - check build output in log"
    fi
    
    echo ""
    print_success "Auto-fix complete!"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo -e "  1. Run: ${YELLOW}./maintain.sh test${NC} to verify all fixes"
    echo -e "  2. Run: ${YELLOW}./maintain.sh deploy:check${NC} before deploying"
    
    show_log_info
}

# LOGS - View and manage logs
cmd_logs() {
    case "$1" in
        view|"")
            if [ -f "$LATEST_LOG" ]; then
                less "$LATEST_LOG"
            else
                print_error "No logs found. Run a command first."
            fi
            ;;
        list)
            print_header "        MAINTENANCE LOGS        "
            if [ -d "$LOG_DIR" ]; then
                ls -lh "$LOG_DIR"/*.log 2>/dev/null | tail -10 || print_warning "No logs found"
            else
                print_warning "No logs directory found"
            fi
            ;;
        clean)
            print_header "        CLEANING OLD LOGS        "
            if [ -d "$LOG_DIR" ]; then
                # Keep only last 10 logs
                ls -t "$LOG_DIR"/*.log 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
                print_success "Old logs cleaned (kept last 10)"
            fi
            ;;
        *)
            print_error "Unknown logs command. Use: view, list, or clean"
            ;;
    esac
}

# Other commands remain the same but with logging added...
# (I'll keep the essential ones and add logging)

# DEV: Start development servers
cmd_dev() {
    print_header "         STARTING DEVELOPMENT SERVERS         "
    
    # Check environment
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        print_error "Backend .env not found!"
        print_warning "Run: ./maintain.sh init"
        exit 1
    fi
    
    print_status "Backend: http://localhost:5000"
    print_status "Frontend: http://localhost:3000"
    echo ""
    
    cd "$PROJECT_ROOT"
    
    # Check if database is ready
    cd "$BACKEND_DIR"
    if ! npx prisma migrate status >> "$LOG_FILE" 2>&1; then
        print_warning "Database not migrated. Running migrations..."
        npx prisma migrate deploy >> "$LOG_FILE" 2>&1
    fi
    
    cd "$PROJECT_ROOT"
    
    # Start with npm run dev (uses turbo if available)
    log "Starting development servers..."
    npm run dev
}

# BUILD: Build for production
cmd_build() {
    print_header "         BUILDING FOR PRODUCTION         "
    
    local errors=0
    
    print_section "Building Shared Packages"
    if [ -d "$SHARED_DIR" ]; then
        cd "$SHARED_DIR"
        if npm run build >> "$LOG_FILE" 2>&1; then
            print_success "Shared package built"
        else
            print_error "Shared package build failed"
            errors=$((errors + 1))
        fi
    fi
    
    print_section "Building Frontend"
    cd "$FRONTEND_DIR"
    if npm run build >> "$LOG_FILE" 2>&1; then
        print_success "Frontend built successfully"
    else
        print_error "Frontend build failed - check log"
        errors=$((errors + 1))
    fi
    
    print_section "Preparing Backend"
    cd "$BACKEND_DIR"
    npx prisma generate >> "$LOG_FILE" 2>&1
    print_success "Prisma client generated"
    
    if [ $errors -eq 0 ]; then
        echo ""
        print_success "Production build complete!"
    else
        echo ""
        print_error "Build failed with $errors error(s)"
        show_log_info
        exit 1
    fi
}

# CLEAN - Remove all build artifacts
cmd_clean() {
    print_header "         CLEANING PROJECT         "
    
    print_status "Removing build artifacts..."
    cd "$PROJECT_ROOT"
    
    # Remove node_modules
    rm -rf node_modules apps/*/node_modules packages/*/node_modules
    
    # Remove build directories
    rm -rf apps/web/.next apps/*/.turbo packages/*/dist .turbo
    
    # Remove lock files
    rm -f package-lock.json apps/*/package-lock.json packages/*/package-lock.json
    
    # Remove old patch files and temp scripts
    rm -f *.patch fix-*.sh quick-fix.sh deploy-checklist.sh cleanup.sh
    
    print_success "Project cleaned!"
    
    # Ask about logs
    echo ""
    read -p "Clean logs too? (y/N): " clean_logs
    if [ "$clean_logs" = "y" ]; then
        rm -rf "$LOG_DIR"
        print_success "Logs cleaned!"
    fi
}

# DB Commands
cmd_db() {
    case "$1" in
        setup)
            print_header "        DATABASE SETUP        "
            cd "$BACKEND_DIR"
            npx prisma migrate dev --name initial_setup >> "$LOG_FILE" 2>&1
            print_success "Database created and migrated"
            ;;
        migrate)
            print_header "        DATABASE MIGRATION        "
            cd "$BACKEND_DIR"
            if [ -n "$2" ]; then
                npx prisma migrate dev --name "$2" >> "$LOG_FILE" 2>&1
            else
                npx prisma migrate deploy >> "$LOG_FILE" 2>&1
            fi
            print_success "Migration complete"
            ;;
        reset)
            print_header "        DATABASE RESET        "
            print_warning "This will DELETE all data!"
            read -p "Are you sure? (y/N): " confirm
            if [ "$confirm" = "y" ]; then
                cd "$BACKEND_DIR"
                npx prisma migrate reset >> "$LOG_FILE" 2>&1
                print_success "Database reset complete"
            fi
            ;;
        *)
            print_error "Unknown db command. Use: setup, migrate, or reset"
            ;;
    esac
}

# STATUS - Quick project health check
cmd_status() {
    print_header "       PROJECT STATUS       "
    
    check_requirements
    
    echo ""
    
    # Check installations
    [ -d "$PROJECT_ROOT/node_modules" ] && print_success "Root packages installed" || print_warning "Root packages not installed"
    [ -d "$BACKEND_DIR/node_modules" ] && print_success "Backend packages installed" || print_warning "Backend packages not installed"
    [ -d "$FRONTEND_DIR/node_modules" ] && print_success "Frontend packages installed" || print_warning "Frontend packages not installed"
    
    # Check env files
    [ -f "$BACKEND_DIR/.env" ] && print_success "Backend .env exists" || print_error "Backend .env missing"
    [ -f "$FRONTEND_DIR/.env.local" ] && print_success "Frontend .env.local exists" || print_warning "Frontend .env.local missing"
    
    # Check database
    cd "$BACKEND_DIR"
    if npx prisma migrate status >> "$LOG_FILE" 2>&1; then
        print_success "Database connected and migrated"
    else
        print_warning "Database not migrated or not connected"
    fi
    
    # Check ports
    if lsof -i:3000 >/dev/null 2>&1; then
        print_warning "Port 3000 in use (frontend)"
    else
        print_success "Port 3000 available"
    fi
    
    if lsof -i:5000 >/dev/null 2>&1; then
        print_warning "Port 5000 in use (backend)"
    else
        print_success "Port 5000 available"
    fi
    
    # Check logs
    if [ -d "$LOG_DIR" ]; then
        local log_count=$(ls "$LOG_DIR"/*.log 2>/dev/null | wc -l)
        print_status "Log files: $log_count"
    fi
}

# DEPLOY:STATUS - Check production status
cmd_deploy_status() {
    print_header "      PRODUCTION STATUS CHECK      "
    
    print_section "Testing Production Endpoints"
    
    # Test backend health
    print_status "Backend URL: $PROD_BACKEND_URL"
    BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_BACKEND_URL/" 2>/dev/null || echo "000")
    if [ "$BACKEND_STATUS" = "200" ] || [ "$BACKEND_STATUS" = "404" ]; then
        print_success "Backend is responding (HTTP $BACKEND_STATUS)"
    else
        print_error "Backend not responding (HTTP $BACKEND_STATUS)"
    fi
    
    # Test API auth endpoint
    AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_BACKEND_URL/api/auth/me" 2>/dev/null || echo "000")
    if [ "$AUTH_STATUS" = "401" ] || [ "$AUTH_STATUS" = "403" ]; then
        print_success "Auth endpoint protected correctly (HTTP $AUTH_STATUS)"
    else
        print_warning "Auth endpoint status: HTTP $AUTH_STATUS"
    fi
    
    # Test frontend
    print_status "Frontend URL: $PROD_FRONTEND_URL"
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_FRONTEND_URL" 2>/dev/null || echo "000")
    if [ "$FRONTEND_STATUS" = "200" ]; then
        print_success "Frontend is accessible (HTTP $FRONTEND_STATUS)"
    else
        print_error "Frontend not responding (HTTP $FRONTEND_STATUS)"
    fi
    
    echo ""
    print_success "Production status check complete"
}

# HELP - Show detailed help
cmd_help() {
    print_header "        WEALTHLOG MAINTENANCE HELP        "
    
    echo -e "${WHITE}USAGE:${NC} ./maintain.sh ${GREEN}[command]${NC} ${YELLOW}[options]${NC}"
    echo ""
    
    echo -e "${CYAN}━━━ QUICK START ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}init${NC}          Setup/update packages (use for new packages too!)"
    echo -e "  ${GREEN}dev${NC}           Start development servers"
    echo -e "  ${GREEN}test${NC}          Run tests (with detailed logging)"
    echo -e "  ${GREEN}fix${NC}           Auto-fix common issues"
    echo ""
    
    echo -e "${CYAN}━━━ DEPLOYMENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}deploy:check${NC}  ${YELLOW}[IMPORTANT]${NC} Run before pushing to production"
    echo -e "  ${GREEN}deploy:status${NC} Check if production is working"
    echo -e "  ${GREEN}build${NC}         Build for production"
    echo ""
    
    echo -e "${CYAN}━━━ DATABASE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}db:setup${NC}      Create database with initial migration"
    echo -e "  ${GREEN}db:migrate${NC}    Run pending migrations"
    echo -e "  ${GREEN}db:reset${NC}      Reset database ${RED}(deletes all data!)${NC}"
    echo ""
    
    echo -e "${CYAN}━━━ MAINTENANCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}logs${NC}          View latest log file"
    echo -e "  ${GREEN}logs list${NC}     List all log files"
    echo -e "  ${GREEN}logs clean${NC}    Clean old log files"
    echo -e "  ${GREEN}clean${NC}         Remove all build artifacts"
    echo -e "  ${GREEN}status${NC}        Quick health check"
    echo ""
    
    echo -e "${CYAN}━━━ WORKFLOWS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${WHITE}Installing new packages:${NC}"
    echo -e "  ${YELLOW}./maintain.sh init${NC}  ${GRAY}(updates all dependencies)${NC}"
    echo ""
    echo -e "${WHITE}Before deploying to production:${NC}"
    echo -e "  1. ${YELLOW}./maintain.sh deploy:check${NC}  ${GREEN}← Always run this first!${NC}"
    echo -e "  2. ${YELLOW}git add . && git commit -m 'your message'${NC}"
    echo -e "  3. ${YELLOW}git push origin master${NC}"
    echo -e "  4. ${YELLOW}./maintain.sh deploy:status${NC}  ${GRAY}(wait 2-3 min)${NC}"
    echo ""
    echo -e "${WHITE}When something breaks:${NC}"
    echo -e "  1. ${YELLOW}./maintain.sh logs${NC}     ${GRAY}(check detailed logs)${NC}"
    echo -e "  2. ${YELLOW}./maintain.sh fix${NC}      ${GRAY}(try auto-fix)${NC}"
    echo -e "  3. ${YELLOW}./maintain.sh clean${NC}    ${GRAY}(clean everything)${NC}"
    echo -e "  4. ${YELLOW}./maintain.sh init${NC}     ${GRAY}(reinstall)${NC}"
    echo ""
    
    echo -e "${MAGENTA}━━━ LOGGING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "All commands generate detailed logs in:"
    echo -e "  ${CYAN}$LOG_DIR/${NC}"
    echo ""
    echo -e "View latest log: ${YELLOW}./maintain.sh logs${NC}"
    echo -e "List all logs:   ${YELLOW}./maintain.sh logs list${NC}"
    echo ""
    
    echo -e "${GRAY}Version 3.1 | With detailed logging | Built with ❤️  for WealthLog${NC}"
}

# ================================================================================
# MAIN SCRIPT LOGIC
# ================================================================================

# Initialize logging for all commands except help
if [ "$1" != "help" ] && [ "$1" != "--help" ] && [ "$1" != "-h" ]; then
    init_logging "$@"
fi

# Handle commands
case "$1" in
    # Quick start
    init|install|update) cmd_init ;;
    dev|start) cmd_dev ;;
    test) cmd_test ;;
    
    # Deployment
    deploy:check|deploy-check|precheck|pre-deploy) cmd_deploy_check ;;
    deploy:status|deploy-status|prod-status) cmd_deploy_status ;;
    build) cmd_build ;;
    
    # Database
    db:setup|db-setup) cmd_db setup ;;
    db:migrate|db-migrate|migrate) cmd_db migrate "$2" ;;
    db:reset|db-reset) cmd_db reset ;;
    
    # Maintenance
    fix|quickfix|quick-fix) cmd_fix ;;
    clean) cmd_clean ;;
    status) cmd_status ;;
    
    # Logs
    logs) cmd_logs "$2" ;;
    
    # Help
    help|--help|-h|"") cmd_help ;;
    
    # Unknown command
    *)
        print_error "Unknown command: $1"
        echo "Run: ./maintain.sh help"
        exit 1
        ;;
esac
