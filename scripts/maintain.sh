#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                     WealthLog Maintenance Script v5.0                         ║
# ║                    Modular Architecture with Enhanced Features                ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
#
# Usage: ./maintain.sh [command] [options]
# Run: ./maintain.sh help for all commands

set -e  # Exit on error

# ================================================================================
# INITIALIZATION
# ================================================================================

# Get script directory and export for libraries
export MAINTAIN_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source library modules from lib/ subdirectory
source "$MAINTAIN_SCRIPT_DIR/lib/common.sh"
source "$MAINTAIN_SCRIPT_DIR/lib/init.sh"
source "$MAINTAIN_SCRIPT_DIR/lib/config.sh"
source "$MAINTAIN_SCRIPT_DIR/lib/database.sh"
source "$MAINTAIN_SCRIPT_DIR/lib/logs.sh"
source "$MAINTAIN_SCRIPT_DIR/lib/mobile.sh"
source "$MAINTAIN_SCRIPT_DIR/lib/doctor.sh"
source "$MAINTAIN_SCRIPT_DIR/lib/testing.sh"

# Load configuration (config.env is in scripts/, not scripts/lib/)
if ! load_config "$MAINTAIN_SCRIPT_DIR/config.env"; then
    echo "Warning: Configuration not loaded. Creating default..."
    cmd_config_create
    load_config "$MAINTAIN_SCRIPT_DIR/config.env"
fi

# ================================================================================
# MAIN COMMANDS
# ================================================================================

# INIT: First-time project setup
cmd_init() {
    print_header "         INITIALIZING WEALTHLOG PROJECT         "
    
    check_requirements
    
    # Export configuration to env files first
    print_section "Creating Environment Files"
    cmd_config_export
    
    # Install all dependencies
    init_all_dependencies
    
    # Build shared package
    if [ -d "$SHARED_DIR" ]; then
        cd "$SHARED_DIR"
        print_section "Building Shared Package"
        
        # Make sure TypeScript is available
        if [ -f "node_modules/typescript/bin/tsc" ]; then
            print_status "Building shared package..."
            if npm run build >> "$LOG_FILE" 2>&1; then
                print_success "Shared package built"
            else
                print_warning "Shared package build failed - check log"
            fi
        else
            print_warning "TypeScript not found - skipping build"
        fi
    fi
    
    # Generate Prisma client
    if [ -d "$BACKEND_DIR" ]; then
        cd "$BACKEND_DIR"
        print_section "Setting Up Database Client"
        
        # Use --yes flag to auto-accept
        print_status "Generating Prisma client..."
        if npx --yes prisma generate >> "$LOG_FILE" 2>&1; then
            print_success "Prisma client generated"
        else
            print_warning "Prisma client generation failed - check log"
        fi
    fi
    
    echo ""
    print_header "          INITIALIZATION COMPLETE!          "
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo -e "  1. Run: ${YELLOW}./maintain.sh config edit${NC} to configure settings"
    echo -e "  2. Run: ${YELLOW}./maintain.sh db:setup${NC} to create database"
    echo -e "  3. Run: ${YELLOW}./maintain.sh dev${NC} to start development"
    
    show_log_info
}

# START: Start services
cmd_start() {
    local service="${1:-all}"
    
    case "$service" in
        backend)
            print_header "Starting Backend Server"
            
            # Check port
            if port_in_use "$DEV_BACKEND_PORT"; then
                print_warning "Port $DEV_BACKEND_PORT is in use"
                read -p "Kill existing process? (y/N): " kill_confirm
                if [ "$kill_confirm" = "y" ]; then
                    kill_port "$DEV_BACKEND_PORT"
                    print_success "Port freed"
                else
                    exit 1
                fi
            fi
            
            cd "$BACKEND_DIR"
            
            # Check env
            if [ ! -f ".env" ]; then
                print_warning "Creating .env from config..."
                cmd_config_export
            fi
            
            print_status "Starting backend on port $DEV_BACKEND_PORT..."
            print_status "URL: http://localhost:$DEV_BACKEND_PORT"
            npm run dev
            ;;
            
        frontend|web)
            print_header "Starting Frontend Server"
            
            # Check port
            if port_in_use "$DEV_FRONTEND_PORT"; then
                print_warning "Port $DEV_FRONTEND_PORT is in use"
                read -p "Kill existing process? (y/N): " kill_confirm
                if [ "$kill_confirm" = "y" ]; then
                    kill_port "$DEV_FRONTEND_PORT"
                    print_success "Port freed"
                else
                    exit 1
                fi
            fi
            
            cd "$FRONTEND_DIR"
            
            # Check env
            if [ ! -f ".env.local" ]; then
                print_warning "Creating .env.local from config..."
                cmd_config_export
            fi
            
            print_status "Starting frontend on port $DEV_FRONTEND_PORT..."
            print_status "URL: http://localhost:$DEV_FRONTEND_PORT"
            npm run dev
            ;;
            
        mobile)
            cmd_mobile_dev
            ;;
            
        all|both)
            print_header "Starting All Services"
            
            # Check environments
            if [ ! -f "$BACKEND_DIR/.env" ] || [ ! -f "$FRONTEND_DIR/.env.local" ]; then
                print_warning "Creating environment files from config..."
                cmd_config_export
            fi
            
            print_status "Backend: http://localhost:$DEV_BACKEND_PORT"
            print_status "Frontend: http://localhost:$DEV_FRONTEND_PORT"
            echo ""
            
            # Check database
            cd "$BACKEND_DIR"
            if ! npx prisma migrate status >> "$LOG_FILE" 2>&1; then
                print_warning "Running database migrations..."
                npx prisma migrate deploy >> "$LOG_FILE" 2>&1
            fi
            
            # Start with turbo
            cd "$PROJECT_ROOT/wealthlogs-code"
            npm run dev
            ;;
            
        *)
            print_error "Unknown service: $service"
            echo "Usage: ./scripts/maintain.sh start [backend|frontend|mobile|all]"
            exit 1
            ;;
    esac
}

# DEV: Alias for start all
cmd_dev() {
    cmd_start "all"
}

# TEST: Run tests
cmd_test() {
    # Check if comprehensive test requested
    if [ "$1" = "comprehensive" ] || [ "$1" = "full" ]; then
        cmd_test_comprehensive
        return $?
    fi
    
    print_header "           RUNNING TEST SUITE           "
    
    # Check dependencies first
    print_section "Checking Dependencies"
    if ! quick_dependency_check; then
        print_error "Dependencies not installed"
        print_status "Run './maintain.sh init' first"
        return 1
    fi
    
    local errors=0
    
    # Test shared package
    if [ -d "$SHARED_DIR" ] && [ -d "$SHARED_DIR/node_modules" ]; then
        print_section "Testing Shared Package"
        cd "$SHARED_DIR"
        
        # Use local TypeScript
        if [ -f "node_modules/typescript/bin/tsc" ]; then
            if npm run build >> "$LOG_FILE" 2>&1; then
                print_success "Shared package builds"
            else
                print_error "Shared package build failed"
                errors=$((errors + 1))
            fi
        else
            print_warning "TypeScript not installed in shared - skipping"
        fi
    fi
    
    # Test frontend
    if [ -d "$FRONTEND_DIR" ] && [ -d "$FRONTEND_DIR/node_modules" ]; then
        print_section "Testing Frontend"
        cd "$FRONTEND_DIR"
        
        # TypeScript check using local installation
        print_test "TypeScript validation..."
        if [ -f "node_modules/typescript/bin/tsc" ]; then
            if npx tsc --noEmit >> "$LOG_FILE" 2>&1; then
                print_success "TypeScript valid"
            else
                print_warning "TypeScript has issues"
                errors=$((errors + 1))
            fi
        else
            print_warning "TypeScript not installed - skipping"
        fi
        
        # Build test
        print_test "Production build test..."
        if [ -f "node_modules/next/dist/bin/next" ]; then
            if npm run build >> "$LOG_FILE" 2>&1; then
                print_success "Production build works"
            else
                print_error "Production build failed"
                errors=$((errors + 1))
            fi
        else
            print_warning "Next.js not installed - skipping build test"
        fi
    fi
    
    # Test backend
    if [ -d "$BACKEND_DIR" ] && [ -d "$BACKEND_DIR/node_modules" ]; then
        print_section "Testing Backend"
        cd "$BACKEND_DIR"
        
        # Prisma validation using --yes flag
        print_test "Prisma schema validation..."
        if npx --yes prisma validate >> "$LOG_FILE" 2>&1; then
            print_success "Prisma schema valid"
        else
            print_error "Prisma schema invalid"
            errors=$((errors + 1))
        fi
    fi
    
    # Summary
    echo ""
    if [ $errors -eq 0 ]; then
        print_success "All tests passed!"
    else
        print_error "$errors test(s) failed"
        show_log_info
        exit 1
    fi
}

# BUILD: Build for production
cmd_build() {
    print_header "         BUILDING FOR PRODUCTION         "
    
    # Build shared
    if [ -d "$SHARED_DIR" ]; then
        print_section "Building Shared Package"
        cd "$SHARED_DIR"
        npm run build >> "$LOG_FILE" 2>&1
        print_success "Shared package built"
    fi
    
    # Build frontend
    print_section "Building Frontend"
    cd "$FRONTEND_DIR"
    npm run build >> "$LOG_FILE" 2>&1
    print_success "Frontend built"
    
    # Prepare backend
    print_section "Preparing Backend"
    cd "$BACKEND_DIR"
    npx prisma generate >> "$LOG_FILE" 2>&1
    print_success "Backend prepared"
    
    echo ""
    print_success "Production build complete!"
}

# CLEAN: Clean project
cmd_clean() {
    print_header "         CLEANING PROJECT         "
    
    print_warning "This will remove all build artifacts and dependencies"
    read -p "Continue? (y/N): " confirm
    
    if [ "$confirm" != "y" ]; then
        print_status "Cancelled"
        return
    fi
    
    print_status "Removing node_modules..."
    find "$PROJECT_ROOT/wealthlogs-code" -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
    
    print_status "Removing build directories..."
    rm -rf "$FRONTEND_DIR/.next" "$FRONTEND_DIR/out"
    rm -rf "$MOBILE_DIR/build" "$MOBILE_DIR/ios/build" "$MOBILE_DIR/android/build"
    find "$PROJECT_ROOT/wealthlogs-code" -name "dist" -type d -prune -exec rm -rf {} + 2>/dev/null || true
    
    print_status "Removing lock files..."
    find "$PROJECT_ROOT/wealthlogs-code" -name "package-lock.json" -delete 2>/dev/null || true
    find "$PROJECT_ROOT/wealthlogs-code" -name "yarn.lock" -delete 2>/dev/null || true
    
    print_success "Project cleaned!"
    
    # Ask about logs
    read -p "Clean logs too? (y/N): " clean_logs
    if [ "$clean_logs" = "y" ]; then
        cmd_logs_clean 0
    fi
}

# FIX: Auto-fix common issues
cmd_fix() {
    print_header "        AUTO-FIXING COMMON ISSUES        "
    
    print_section "Fixing TypeScript Errors"
    
    cd "$FRONTEND_DIR"
    
    # Install missing types
    print_status "Installing type definitions..."
    npm install --save-dev @types/papaparse @types/node @types/react >> "$LOG_FILE" 2>&1
    print_success "Type definitions installed"
    
    # Fix error handling
    print_status "Fixing error handling in TypeScript files..."
    find . -name "*.tsx" -o -name "*.ts" | while read -r file; do
        # Fix catch blocks
        sed -i.bak 's/catch (error)/catch (error: any)/g' "$file" 2>/dev/null || \
        sed -i '' 's/catch (error)/catch (error: any)/g' "$file" 2>/dev/null || true
        rm -f "$file.bak"
    done
    print_success "Error handling fixed"
    
    print_section "Rebuilding Packages"
    
    # Rebuild shared
    if [ -d "$SHARED_DIR" ]; then
        cd "$SHARED_DIR"
        npm run build >> "$LOG_FILE" 2>&1 || true
        print_success "Shared package rebuilt"
    fi
    
    # Test build
    cd "$FRONTEND_DIR"
    print_test "Testing fixes..."
    if npm run build >> "$LOG_FILE" 2>&1; then
        print_success "Build successful after fixes!"
    else
        print_warning "Some issues remain - check log"
    fi
    
    echo ""
    print_success "Auto-fix complete!"
    print_status "Run './scripts/maintain.sh test' to verify"
}

# DEPLOY:CHECK - Pre-deployment validation
cmd_deploy_check() {
    print_header "       PRE-DEPLOYMENT VALIDATION       "
    
    local ready=true
    
    # Run tests
    print_section "Running Tests"
    if cmd_test; then
        print_success "Tests passed"
    else
        ready=false
    fi
    
    # Check configuration
    print_section "Checking Configuration"
    if cmd_config_validate; then
        print_success "Configuration valid"
    else
        print_warning "Configuration has issues"
    fi
    
    # Check git status
    print_section "Git Status"
    cd "$PROJECT_ROOT"
    
    if [ -d .git ]; then
        if git diff-index --quiet HEAD -- 2>/dev/null; then
            print_success "No uncommitted changes"
        else
            print_warning "You have uncommitted changes"
        fi
        
        local branch=$(git rev-parse --abbrev-ref HEAD)
        print_status "Current branch: $branch"
    fi
    
    # Summary
    echo ""
    if [ "$ready" = true ]; then
        print_header "    ✅ READY FOR DEPLOYMENT!    "
        echo -e "${GREEN}Push to trigger automatic deployment${NC}"
    else
        print_header "    ❌ NOT READY FOR DEPLOYMENT    "
        print_error "Fix issues before deploying"
    fi
}

# USER:CREATE - Create a new user
cmd_user_create() {
    print_header "       CREATE NEW USER       "
    
    local username="$1"
    local password="$2"
    
    if [ -z "$username" ] || [ -z "$password" ]; then
        print_error "Usage: ./maintain.sh user:create <username> <password>"
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    print_status "Creating user: $username"
    
    # Create a simple Node.js script to create user
    cat > /tmp/create_user.js << EOF
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser() {
    try {
        const hashedPassword = await bcrypt.hash('$password', 10);
        
        const user = await prisma.user.create({
            data: {
                username: '$username',
                email: '${username}@example.com',
                password: hashedPassword,
                firstName: 'Test',
                lastName: 'User',
                emailVerified: true,
                roles: {
                    connectOrCreate: {
                        where: { name: 'MEMBER' },
                        create: { name: 'MEMBER', description: 'Standard member' }
                    }
                }
            }
        });
        
        console.log('User created successfully:', user.username);
        process.exit(0);
    } catch (error) {
        if (error.code === 'P2002') {
            console.error('User already exists');
        } else {
            console.error('Error creating user:', error.message);
        }
        process.exit(1);
    }
}

createUser();
EOF
    
    # Run the script
    if node /tmp/create_user.js >> "$LOG_FILE" 2>&1; then
        print_success "User created: $username"
        print_status "Password: $password"
    else
        print_error "Failed to create user - check log"
        show_log_info
    fi
    
    rm -f /tmp/create_user.js
}

# USER:LIST - List all users
cmd_user_list() {
    print_header "       USER LIST       "
    
    cd "$BACKEND_DIR"
    
    # Create a simple script to list users
    cat > /tmp/list_users.js << 'EOF'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                emailVerified: true,
                createdAt: true,
                lastLoginAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        
        console.log('\nUsers in database:');
        console.log('==================');
        users.forEach(user => {
            console.log(`\nID: ${user.id}`);
            console.log(`Username: ${user.username}`);
            console.log(`Email: ${user.email}`);
            console.log(`Name: ${user.firstName} ${user.lastName}`);
            console.log(`Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
            console.log(`Created: ${user.createdAt.toLocaleDateString()}`);
            console.log(`Last Login: ${user.lastLoginAt ? user.lastLoginAt.toLocaleDateString() : 'Never'}`);
        });
        console.log(`\nTotal users: ${users.length}`);
        process.exit(0);
    } catch (error) {
        console.error('Error listing users:', error.message);
        process.exit(1);
    }
}

listUsers();
EOF
    
    # Run the script
    node /tmp/list_users.js
    rm -f /tmp/list_users.js
}

# USER:RESET-PASSWORD - Reset user password
cmd_user_reset_password() {
    print_header "     RESET USER PASSWORD     "
    
    local username="$1"
    
    if [ -z "$username" ]; then
        print_error "Usage: ./maintain.sh user:reset-password <username>"
        return 1
    fi
    
    read -s -p "Enter new password: " new_password
    echo ""
    
    if [ -z "$new_password" ]; then
        print_error "Password cannot be empty"
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    # Create script to reset password
    cat > /tmp/reset_password.js << EOF
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
    try {
        const hashedPassword = await bcrypt.hash('$new_password', 10);
        
        const user = await prisma.user.update({
            where: { username: '$username' },
            data: { password: hashedPassword }
        });
        
        console.log('Password reset successfully for:', user.username);
        process.exit(0);
    } catch (error) {
        if (error.code === 'P2025') {
            console.error('User not found');
        } else {
            console.error('Error resetting password:', error.message);
        }
        process.exit(1);
    }
}

resetPassword();
EOF
    
    if node /tmp/reset_password.js >> "$LOG_FILE" 2>&1; then
        print_success "Password reset for: $username"
    else
        print_error "Failed to reset password - check log"
        show_log_info
    fi
    
    rm -f /tmp/reset_password.js
}

# AUTH:TEST - Test authentication
cmd_auth_test() {
    print_header "      AUTHENTICATION TESTING      "
    
    local env="${1:-local}"
    local api_url
    
    if [ "$env" = "prod" ] || [ "$env" = "production" ]; then
        api_url="$PROD_BACKEND_URL"
        print_status "Testing PRODUCTION authentication"
    else
        api_url="http://localhost:$DEV_BACKEND_PORT"
        print_status "Testing LOCAL authentication"
    fi
    
    # Test login
    print_test "Testing login endpoint..."
    
    local response=$(curl -s -X POST "$api_url/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$TEST_USERNAME\", \"password\": \"$TEST_PASSWORD\"}" 2>/dev/null)
    
    if echo "$response" | grep -q "accessToken"; then
        print_success "Login successful"
        
        # Extract token
        local token=$(echo "$response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        
        # Test protected route
        print_test "Testing protected route..."
        local me_response=$(curl -s "$api_url/api/auth/me" \
            -H "Authorization: Bearer $token" 2>/dev/null)
        
        if echo "$me_response" | grep -q "user"; then
            print_success "Protected route accessible"
        else
            print_error "Protected route failed"
        fi
    else
        print_warning "Login failed - user may not exist"
    fi
    
    echo ""
    print_success "Authentication test complete"
}

# HELP - Show help
cmd_help() {
    print_header "        WEALTHLOG MAINTENANCE HELP        "
    
    echo -e "${WHITE}USAGE:${NC} ./scripts/maintain.sh ${GREEN}[command]${NC} ${YELLOW}[options]${NC}"
    echo ""
    
    echo -e "${CYAN}━━━ QUICK START ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}init${NC}          Initialize/update project"
    echo -e "  ${GREEN}dev${NC}           Start all development servers"
    echo -e "  ${GREEN}start${NC}         Start specific service"
    echo -e "  ${GREEN}test${NC}          Run test suite"
    echo -e "  ${GREEN}test full${NC}     Run comprehensive tests"
    echo -e "  ${GREEN}build${NC}         Build for production"
    echo ""
    
    echo -e "${CYAN}━━━ CONFIGURATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}config${NC}        Manage configuration"
    echo -e "  ${GREEN}config edit${NC}   Edit configuration"
    echo -e "  ${GREEN}config validate${NC} Validate settings"
    echo ""
    
    echo -e "${CYAN}━━━ DATABASE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}db:setup${NC}      Setup database"
    echo -e "  ${GREEN}db:migrate${NC}    Run migrations"
    echo -e "  ${GREEN}db:studio${NC}     Open Prisma Studio"
    echo -e "  ${GREEN}db:backup${NC}     Backup database"
    echo ""
    
    echo -e "${CYAN}━━━ USER MANAGEMENT ━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}user:create${NC}   Create new user"
    echo -e "  ${GREEN}user:list${NC}     List all users"
    echo -e "  ${GREEN}user:reset-password${NC} Reset password"
    echo ""
    
    echo -e "${CYAN}━━━ MOBILE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}mobile init${NC}   Initialize mobile app"
    echo -e "  ${GREEN}mobile build${NC}  Build mobile app"
    echo -e "  ${GREEN}mobile run${NC}    Run on device"
    echo ""
    
    echo -e "${CYAN}━━━ MAINTENANCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}doctor${NC}        Run diagnostics"
    echo -e "  ${GREEN}status${NC}        Quick status check"
    echo -e "  ${GREEN}fix${NC}           Auto-fix issues"
    echo -e "  ${GREEN}clean${NC}         Clean project"
    echo ""
    
    echo -e "${CYAN}━━━ LOGS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}logs${NC}          View logs"
    echo -e "  ${GREEN}logs list${NC}     List all logs"
    echo -e "  ${GREEN}logs clean${NC}    Clean old logs"
    echo ""
    
    echo -e "${CYAN}━━━ DEPLOYMENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}deploy:check${NC}  Pre-deployment check"
    echo -e "  ${GREEN}auth:test${NC}     Test authentication"
    echo ""
    
    echo -e "${GRAY}Version 5.0 | Modular Architecture${NC}"
    echo -e "${GRAY}Config: $SCRIPT_DIR/config.env${NC}"
}

# ================================================================================
# MAIN SCRIPT LOGIC
# ================================================================================

# Initialize logging (except for help)
if [ "$1" != "help" ] && [ "$1" != "--help" ] && [ "$1" != "-h" ]; then
    setup_logging "$@"
fi

# Handle commands
case "$1" in
    # Quick start
    init|install|setup)
        cmd_init
        ;;
    dev)
        cmd_dev
        ;;
    start)
        cmd_start "$2"
        ;;
    test)
        if [ "$2" = "frontend" ]; then
            cmd_test_frontend
        else
            cmd_test "$2"
        fi
        ;;
    build)
        cmd_build
        ;;
    
    # Configuration
    config)
        cmd_config "$2" "$3"
        ;;
    
    # Database
    db:*)
        cmd_db "${1#db:}" "$2" "$3"
        ;;
    
    # User management
    user:create)
        cmd_user_create "$2" "$3"
        ;;
    user:list)
        cmd_user_list
        ;;
    user:reset-password)
        cmd_user_reset_password "$2"
        ;;
    
    # Mobile
    mobile)
        cmd_mobile "$2" "$3"
        ;;
    
    # Logs
    logs)
        cmd_logs "$2" "$3"
        ;;
    
    # Maintenance
    doctor)
        cmd_doctor
        ;;
    status)
        cmd_status
        ;;
    fix)
        cmd_fix
        ;;
    clean)
        cmd_clean
        ;;
    
    # Deployment
    deploy:check|precheck)
        cmd_deploy_check
        ;;
    auth:test)
        cmd_auth_test "$2"
        ;;
    
    # Help
    help|--help|-h|"")
        cmd_help
        ;;
    
    # Unknown
    *)
        print_error "Unknown command: $1"
        echo "Run: ./scripts/maintain.sh help"
        exit 1
        ;;
esac

# Show log info at the end (if not help)
if [ "$1" != "help" ] && [ "$1" != "--help" ] && [ "$1" != "-h" ] && [ "$1" != "" ]; then
    show_log_info
fi
