#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                        System Diagnostics & Doctor Functions                   ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# Source common functions
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

# ================================================================================
# DOCTOR COMMANDS
# ================================================================================

# Comprehensive system check
cmd_doctor() {
    print_header "       COMPREHENSIVE SYSTEM DIAGNOSTICS       "
    
    local total_checks=0
    local passed_checks=0
    local warnings=0
    local errors=0
    
    # System Requirements
    print_section "System Requirements"
    
    # Check OS
    local os=$(get_os)
    total_checks=$((total_checks + 1))
    print_status "Operating System: $os"
    passed_checks=$((passed_checks + 1))
    
    # Check Node.js
    total_checks=$((total_checks + 1))
    if command_exists node; then
        local node_version=$(node --version)
        if check_node_version "${NODE_VERSION_REQUIRED:-18.0.0}"; then
            print_success "Node.js: $node_version ✓"
            passed_checks=$((passed_checks + 1))
        else
            print_warning "Node.js: $node_version (${NODE_VERSION_REQUIRED:-18.0.0}+ recommended)"
            warnings=$((warnings + 1))
        fi
    else
        print_error "Node.js: Not installed"
        errors=$((errors + 1))
    fi
    
    # Check npm
    total_checks=$((total_checks + 1))
    if command_exists npm; then
        local npm_version=$(npm --version)
        if check_npm_version "${NPM_VERSION_REQUIRED:-9.0.0}"; then
            print_success "npm: $npm_version ✓"
            passed_checks=$((passed_checks + 1))
        else
            print_warning "npm: $npm_version (${NPM_VERSION_REQUIRED:-9.0.0}+ recommended)"
            warnings=$((warnings + 1))
        fi
    else
        print_error "npm: Not installed"
        errors=$((errors + 1))
    fi
    
    # Check Git
    total_checks=$((total_checks + 1))
    if command_exists git; then
        local git_version=$(git --version | cut -d' ' -f3)
        print_success "Git: $git_version ✓"
        passed_checks=$((passed_checks + 1))
    else
        print_error "Git: Not installed"
        errors=$((errors + 1))
    fi
    
    # Project Structure
    print_section "Project Structure"
    
    # Check directories
    local dirs=("$BACKEND_DIR" "$FRONTEND_DIR" "$SHARED_DIR")
    local dir_names=("Backend" "Frontend" "Shared")
    
    for i in "${!dirs[@]}"; do
        total_checks=$((total_checks + 1))
        if [ -d "${dirs[$i]}" ]; then
            print_success "${dir_names[$i]} directory: Found ✓"
            passed_checks=$((passed_checks + 1))
        else
            print_error "${dir_names[$i]} directory: Not found"
            errors=$((errors + 1))
        fi
    done
    
    # Check package.json files
    print_section "Package Configuration"
    
    local package_files=(
        "$BACKEND_DIR/package.json"
        "$FRONTEND_DIR/package.json"
        "$SHARED_DIR/package.json"
    )
    local package_names=("Backend" "Frontend" "Shared")
    
    for i in "${!package_files[@]}"; do
        total_checks=$((total_checks + 1))
        if [ -f "${package_files[$i]}" ]; then
            print_success "${package_names[$i]} package.json: Found ✓"
            passed_checks=$((passed_checks + 1))
        else
            print_error "${package_names[$i]} package.json: Not found"
            errors=$((errors + 1))
        fi
    done
    
    # Check node_modules
    print_section "Dependencies Installation"
    
    local node_modules_dirs=(
        "$PROJECT_ROOT/wealthlogs-code/node_modules"
        "$BACKEND_DIR/node_modules"
        "$FRONTEND_DIR/node_modules"
    )
    local module_names=("Root" "Backend" "Frontend")
    
    for i in "${!node_modules_dirs[@]}"; do
        total_checks=$((total_checks + 1))
        if [ -d "${node_modules_dirs[$i]}" ]; then
            local count=$(ls "${node_modules_dirs[$i]}" 2>/dev/null | wc -l)
            print_success "${module_names[$i]} dependencies: $count packages ✓"
            passed_checks=$((passed_checks + 1))
        else
            print_warning "${module_names[$i]} dependencies: Not installed"
            warnings=$((warnings + 1))
        fi
    done
    
    # Environment Files
    print_section "Environment Configuration"
    
    # Check backend .env
    total_checks=$((total_checks + 1))
    if [ -f "$BACKEND_DIR/.env" ]; then
        print_success "Backend .env: Found ✓"
        passed_checks=$((passed_checks + 1))
        
        # Check for required variables
        local required_vars=("DATABASE_URL" "JWT_ACCESS_SECRET" "PORT")
        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" "$BACKEND_DIR/.env"; then
                print_success "  • $var: Configured ✓"
            else
                print_warning "  • $var: Not configured"
                warnings=$((warnings + 1))
            fi
        done
    else
        print_warning "Backend .env: Not found (run './maintain.sh init' to create)"
        warnings=$((warnings + 1))
    fi
    
    # Check frontend .env.local
    total_checks=$((total_checks + 1))
    if [ -f "$FRONTEND_DIR/.env.local" ]; then
        print_success "Frontend .env.local: Found ✓"
        passed_checks=$((passed_checks + 1))
    else
        print_warning "Frontend .env.local: Not found (optional)"
        warnings=$((warnings + 1))
    fi
    
    # Database Connection
    print_section "Database Status"
    
    total_checks=$((total_checks + 1))
    cd "$BACKEND_DIR"
    
    # Check Prisma schema
    if [ -f "prisma/schema.prisma" ]; then
        print_success "Prisma schema: Found ✓"
        
        # Validate schema only if dependencies installed
        if [ -d "node_modules" ]; then
            if npx --yes prisma validate >> "$LOG_FILE" 2>&1; then
                print_success "  • Schema validation: Passed ✓"
            else
                print_warning "  • Schema validation: Has issues"
                warnings=$((warnings + 1))
            fi
        else
            print_warning "  • Schema validation: Skipped (dependencies not installed)"
        fi
        
        # Check migration status
        local migration_status=$(npx prisma migrate status 2>&1)
        if echo "$migration_status" | grep -q "Database schema is up to date"; then
            print_success "  • Migrations: Up to date ✓"
            passed_checks=$((passed_checks + 1))
        elif echo "$migration_status" | grep -q "migrations to apply"; then
            print_warning "  • Migrations: Pending migrations"
            warnings=$((warnings + 1))
        else
            print_warning "  • Migrations: Cannot determine status"
            warnings=$((warnings + 1))
        fi
    else
        print_error "Prisma schema: Not found"
        errors=$((errors + 1))
    fi
    
    # Port Availability
    print_section "Network Ports"
    
    local ports=("$DEV_FRONTEND_PORT" "$DEV_BACKEND_PORT")
    local port_names=("Frontend" "Backend")
    
    for i in "${!ports[@]}"; do
        total_checks=$((total_checks + 1))
        if port_in_use "${ports[$i]}"; then
            print_warning "${port_names[$i]} port ${ports[$i]}: In use"
            warnings=$((warnings + 1))
        else
            print_success "${port_names[$i]} port ${ports[$i]}: Available ✓"
            passed_checks=$((passed_checks + 1))
        fi
    done
    
    # Security Check
    print_section "Security Configuration"
    
    total_checks=$((total_checks + 1))
    if [ -n "$JWT_ACCESS_SECRET" ] && [ "$JWT_ACCESS_SECRET" != "" ]; then
        local secret_length=${#JWT_ACCESS_SECRET}
        if [ $secret_length -ge 32 ]; then
            print_success "JWT Secret: Secure ($secret_length chars) ✓"
            passed_checks=$((passed_checks + 1))
        else
            print_warning "JWT Secret: Weak ($secret_length chars, recommend 32+)"
            warnings=$((warnings + 1))
        fi
    else
        print_error "JWT Secret: Not configured"
        errors=$((errors + 1))
    fi
    
    # Check for default passwords
    total_checks=$((total_checks + 1))
    if [ "$DB_PASSWORD" = "password" ]; then
        print_warning "Database Password: Using default (change for production)"
        warnings=$((warnings + 1))
    else
        print_success "Database Password: Custom ✓"
        passed_checks=$((passed_checks + 1))
    fi
    
    # Git Status
    print_section "Version Control"
    
    cd "$PROJECT_ROOT"
    
    total_checks=$((total_checks + 1))
    if [ -d ".git" ]; then
        print_success "Git repository: Initialized ✓"
        passed_checks=$((passed_checks + 1))
        
        # Check branch
        local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
        print_status "  • Current branch: $branch"
        
        # Check for uncommitted changes
        if git diff-index --quiet HEAD -- 2>/dev/null; then
            print_success "  • Working tree: Clean ✓"
        else
            local changes=$(git status --porcelain | wc -l)
            print_warning "  • Working tree: $changes uncommitted change(s)"
            warnings=$((warnings + 1))
        fi
        
        # Check remote
        if git remote -v | grep -q origin; then
            local remote=$(git remote get-url origin 2>/dev/null)
            print_success "  • Remote origin: Configured ✓"
        else
            print_warning "  • Remote origin: Not configured"
            warnings=$((warnings + 1))
        fi
    else
        print_warning "Git repository: Not initialized"
        warnings=$((warnings + 1))
    fi
    
    # Disk Space
    print_section "System Resources"
    
    # Check disk space
    local disk_usage=$(df -h "$PROJECT_ROOT" 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ -n "$disk_usage" ]; then
        total_checks=$((total_checks + 1))
        if [ "$disk_usage" -lt 90 ]; then
            print_success "Disk usage: ${disk_usage}% ✓"
            passed_checks=$((passed_checks + 1))
        else
            print_warning "Disk usage: ${disk_usage}% (low space)"
            warnings=$((warnings + 1))
        fi
    fi
    
    # Check memory (if available)
    if command_exists free; then
        local mem_available=$(free -m | grep Mem | awk '{print $7}')
        if [ -n "$mem_available" ]; then
            total_checks=$((total_checks + 1))
            if [ "$mem_available" -gt 1024 ]; then
                print_success "Available memory: ${mem_available}MB ✓"
                passed_checks=$((passed_checks + 1))
            else
                print_warning "Available memory: ${mem_available}MB (low)"
                warnings=$((warnings + 1))
            fi
        fi
    fi
    
    # Production Readiness
    print_section "Production Readiness"
    
    # Check build
    total_checks=$((total_checks + 1))
    if [ -d "$FRONTEND_DIR/.next" ]; then
        print_success "Frontend build: Found ✓"
        passed_checks=$((passed_checks + 1))
    else
        print_warning "Frontend build: Not built"
        warnings=$((warnings + 1))
    fi
    
    # Check TypeScript errors
    total_checks=$((total_checks + 1))
    cd "$FRONTEND_DIR"
    local ts_check=$(npx tsc --noEmit 2>&1)
    if [ $? -eq 0 ]; then
        print_success "TypeScript: No errors ✓"
        passed_checks=$((passed_checks + 1))
    else
        local ts_errors=$(echo "$ts_check" | grep -c "error TS")
        print_warning "TypeScript: $ts_errors error(s)"
        warnings=$((warnings + 1))
    fi
    
    # Summary
    echo ""
    print_header "    DIAGNOSTIC SUMMARY    "
    
    local percentage=$((passed_checks * 100 / total_checks))
    
    echo -e "${WHITE}Total Checks:${NC} $total_checks"
    echo -e "${GREEN}Passed:${NC} $passed_checks"
    echo -e "${YELLOW}Warnings:${NC} $warnings"
    echo -e "${RED}Errors:${NC} $errors"
    echo ""
    
    # Progress bar
    local bar_length=40
    local filled=$((percentage * bar_length / 100))
    local empty=$((bar_length - filled))
    
    echo -n "Health: ["
    for ((i=0; i<filled; i++)); do echo -n "█"; done
    for ((i=0; i<empty; i++)); do echo -n "░"; done
    echo "] $percentage%"
    
    echo ""
    
    # Overall status
    if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
        print_success "System is healthy and ready! 🎉"
    elif [ $errors -eq 0 ]; then
        print_warning "System is functional with $warnings warning(s)"
        echo ""
        echo "Recommendations:"
        echo "  • Run: ./maintain.sh init"
        echo "  • Run: ./maintain.sh config validate"
        echo "  • Run: ./maintain.sh fix"
    else
        print_error "System has $errors critical issue(s)"
        echo ""
        echo "Required Actions:"
        echo "  1. Run: ./maintain.sh init"
        echo "  2. Run: ./maintain.sh config edit"
        echo "  3. Run: ./maintain.sh db:setup"
        echo "  4. Run: ./maintain.sh fix"
    fi
    
    show_log_info
}

# Quick status check
cmd_status() {
    print_header "       QUICK STATUS CHECK       "
    
    # System info
    echo -e "${WHITE}System:${NC} $(get_os)"
    echo -e "${WHITE}Node:${NC} $(node --version 2>/dev/null || echo 'not installed')"
    echo -e "${WHITE}npm:${NC} $(npm --version 2>/dev/null || echo 'not installed')"
    echo ""
    
    # Check services
    print_section "Services"
    
    # Check if backend is running
    if port_in_use "$DEV_BACKEND_PORT"; then
        print_success "Backend: Running on port $DEV_BACKEND_PORT"
    else
        print_status "Backend: Not running"
    fi
    
    # Check if frontend is running
    if port_in_use "$DEV_FRONTEND_PORT"; then
        print_success "Frontend: Running on port $DEV_FRONTEND_PORT"
    else
        print_status "Frontend: Not running"
    fi
    
    # Check installations
    print_section "Installation"
    
    [ -d "$BACKEND_DIR/node_modules" ] && print_success "Backend: Installed" || print_warning "Backend: Not installed"
    [ -d "$FRONTEND_DIR/node_modules" ] && print_success "Frontend: Installed" || print_warning "Frontend: Not installed"
    
    # Check config
    print_section "Configuration"
    
    [ -f "$SCRIPT_DIR/config.env" ] && print_success "Config: Found" || print_warning "Config: Not found"
    [ -f "$BACKEND_DIR/.env" ] && print_success "Backend .env: Found" || print_warning "Backend .env: Not found"
    [ -f "$FRONTEND_DIR/.env.local" ] && print_success "Frontend .env: Found" || print_status "Frontend .env: Not found"
    
    echo ""
    print_status "Run './maintain.sh doctor' for detailed diagnostics"
}
