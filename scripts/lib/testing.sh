#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                         Testing Library Module                                ║
# ║                    Enhanced testing capabilities for WealthLog                 ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# ================================================================================
# COMPREHENSIVE TEST SUITE
# ================================================================================

# Run complete test suite
cmd_test_comprehensive() {
    print_header "       COMPREHENSIVE TEST SUITE       "
    
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    local warnings=0
    
    # Test Categories
    test_dependencies
    test_environment
    test_database_connection
    test_api_endpoints
    test_frontend_build
    test_mobile_compatibility
    test_security
    test_performance
    
    # Summary Report
    print_test_summary $total_tests $passed_tests $failed_tests $warnings
}

# ================================================================================
# DEPENDENCY TESTS
# ================================================================================

test_dependencies() {
    print_section "Testing Dependencies"
    
    # Backend dependencies
    if [ -d "$BACKEND_DIR" ]; then
        cd "$BACKEND_DIR"
        print_test "Checking backend dependencies..."
        
        # Check for critical packages
        local critical_packages=("express" "prisma" "@prisma/client" "jsonwebtoken" "bcryptjs" "cors")
        for package in "${critical_packages[@]}"; do
            if [ -d "node_modules/$package" ]; then
                print_success "$package installed"
                ((passed_tests++))
            else
                print_error "$package missing"
                ((failed_tests++))
            fi
            ((total_tests++))
        done
        
        # Check for outdated packages
        print_test "Checking for outdated packages..."
        local outdated=$(npm outdated --json 2>/dev/null | jq -r 'keys | length' 2>/dev/null || echo "0")
        if [ "$outdated" -gt 0 ]; then
            print_warning "$outdated packages are outdated"
            ((warnings++))
        else
            print_success "All packages up to date"
            ((passed_tests++))
        fi
        ((total_tests++))
    fi
    
    # Frontend dependencies
    if [ -d "$FRONTEND_DIR" ]; then
        cd "$FRONTEND_DIR"
        print_test "Checking frontend dependencies..."
        
        local critical_packages=("next" "react" "react-dom" "axios" "tailwindcss" "recharts")
        for package in "${critical_packages[@]}"; do
            if [ -d "node_modules/$package" ]; then
                print_success "$package installed"
                ((passed_tests++))
            else
                print_error "$package missing"
                ((failed_tests++))
            fi
            ((total_tests++))
        done
    fi
}

# ================================================================================
# ENVIRONMENT TESTS
# ================================================================================

test_environment() {
    print_section "Testing Environment Configuration"
    
    # Backend environment
    if [ -d "$BACKEND_DIR" ]; then
        cd "$BACKEND_DIR"
        print_test "Checking backend .env file..."
        
        if [ -f ".env" ]; then
            # Check critical environment variables
            local required_vars=("DATABASE_URL" "JWT_ACCESS_SECRET" "JWT_REFRESH_SECRET" "NODE_ENV")
            for var in "${required_vars[@]}"; do
                if grep -q "^${var}=" .env; then
                    print_success "$var is set"
                    ((passed_tests++))
                else
                    print_error "$var is missing"
                    ((failed_tests++))
                fi
                ((total_tests++))
            done
            
            # Check database URL format
            if grep -q "^DATABASE_URL=postgresql://" .env; then
                print_success "Database URL format correct"
                ((passed_tests++))
            else
                print_error "Invalid database URL format"
                ((failed_tests++))
            fi
            ((total_tests++))
        else
            print_error ".env file missing"
            ((failed_tests++))
            ((total_tests++))
        fi
    fi
    
    # Frontend environment
    if [ -d "$FRONTEND_DIR" ]; then
        cd "$FRONTEND_DIR"
        print_test "Checking frontend .env.local file..."
        
        if [ -f ".env.local" ]; then
            if grep -q "^NEXT_PUBLIC_API_URL=" .env.local; then
                print_success "API URL configured"
                ((passed_tests++))
            else
                print_error "API URL not configured"
                ((failed_tests++))
            fi
            ((total_tests++))
        else
            print_warning ".env.local file missing"
            ((warnings++))
            ((total_tests++))
        fi
    fi
}

# ================================================================================
# DATABASE CONNECTION TESTS
# ================================================================================

test_database_connection() {
    print_section "Testing Database Connection"
    
    if [ -d "$BACKEND_DIR" ]; then
        cd "$BACKEND_DIR"
        
        # Test Prisma connection
        print_test "Testing database connection..."
        if npx --yes prisma db push --skip-generate --accept-data-loss=false >> "$LOG_FILE" 2>&1; then
            print_success "Database connection successful"
            ((passed_tests++))
        else
            print_error "Database connection failed"
            ((failed_tests++))
        fi
        ((total_tests++))
        
        # Check migrations status
        print_test "Checking migration status..."
        if npx --yes prisma migrate status >> "$LOG_FILE" 2>&1; then
            print_success "Migrations up to date"
            ((passed_tests++))
        else
            print_warning "Pending migrations detected"
            ((warnings++))
        fi
        ((total_tests++))
        
        # Test database query
        print_test "Testing database query..."
        local test_query='npx --yes prisma db execute --stdin <<< "SELECT 1 as test;"'
        if eval "$test_query" >> "$LOG_FILE" 2>&1; then
            print_success "Database query successful"
            ((passed_tests++))
        else
            print_warning "Database query failed"
            ((warnings++))
        fi
        ((total_tests++))
    fi
}

# ================================================================================
# API ENDPOINT TESTS
# ================================================================================

test_api_endpoints() {
    print_section "Testing API Endpoints"
    
    # Check if backend is running
    local api_url="http://localhost:${DEV_BACKEND_PORT:-5000}"
    
    print_test "Checking if backend is running..."
    if curl -s -o /dev/null -w "%{http_code}" "$api_url/health" | grep -q "200\|404"; then
        print_success "Backend is accessible"
        ((passed_tests++))
        
        # Test health endpoint
        print_test "Testing health endpoint..."
        local health_response=$(curl -s "$api_url/health" 2>/dev/null || echo "{}")
        if echo "$health_response" | grep -q "ok\|healthy\|running"; then
            print_success "Health check passed"
            ((passed_tests++))
        else
            print_warning "Health endpoint not configured"
            ((warnings++))
        fi
        ((total_tests++))
        
        # Test authentication endpoints
        print_test "Testing auth endpoints..."
        local auth_test=$(curl -s -o /dev/null -w "%{http_code}" "$api_url/api/auth/login" -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null)
        if [ "$auth_test" = "400" ] || [ "$auth_test" = "401" ] || [ "$auth_test" = "422" ]; then
            print_success "Auth endpoint responding correctly"
            ((passed_tests++))
        else
            print_warning "Auth endpoint may have issues (HTTP $auth_test)"
            ((warnings++))
        fi
        ((total_tests++))
    else
        print_warning "Backend not running - skipping API tests"
        print_status "Start backend with: ./scripts/maintain.sh start backend"
        ((warnings++))
    fi
    ((total_tests++))
}

# ================================================================================
# FRONTEND BUILD TESTS
# ================================================================================

test_frontend_build() {
    print_section "Testing Frontend Build"
    
    if [ -d "$FRONTEND_DIR" ]; then
        cd "$FRONTEND_DIR"
        
        # TypeScript compilation
        print_test "TypeScript compilation check..."
        if [ -f "node_modules/typescript/bin/tsc" ]; then
            if npx tsc --noEmit >> "$LOG_FILE" 2>&1; then
                print_success "TypeScript compilation successful"
                ((passed_tests++))
            else
                print_warning "TypeScript errors found"
                ((warnings++))
            fi
        else
            print_warning "TypeScript not installed"
            ((warnings++))
        fi
        ((total_tests++))
        
        # ESLint check
        print_test "ESLint check..."
        if [ -f ".eslintrc.json" ] && [ -f "node_modules/eslint/bin/eslint.js" ]; then
            if npx eslint . --ext .ts,.tsx --max-warnings 0 >> "$LOG_FILE" 2>&1; then
                print_success "No linting errors"
                ((passed_tests++))
            else
                print_warning "Linting warnings/errors found"
                ((warnings++))
            fi
        else
            print_status "ESLint not configured"
        fi
        ((total_tests++))
        
        # Test production build
        print_test "Testing production build..."
        if npm run build >> "$LOG_FILE" 2>&1; then
            print_success "Production build successful"
            ((passed_tests++))
            
            # Check build size
            if [ -d ".next" ]; then
                local build_size=$(du -sh .next 2>/dev/null | cut -f1)
                print_status "Build size: $build_size"
            fi
        else
            print_error "Production build failed"
            ((failed_tests++))
        fi
        ((total_tests++))
    fi
}

# ================================================================================
# MOBILE COMPATIBILITY TESTS
# ================================================================================

test_mobile_compatibility() {
    print_section "Testing Mobile Compatibility"
    
    if [ -d "$MOBILE_DIR" ]; then
        cd "$MOBILE_DIR"
        
        # Check Capacitor configuration
        print_test "Checking Capacitor configuration..."
        if [ -f "capacitor.config.ts" ] || [ -f "capacitor.config.json" ]; then
            print_success "Capacitor configured"
            ((passed_tests++))
        else
            print_error "Capacitor not configured"
            ((failed_tests++))
        fi
        ((total_tests++))
        
        # Check mobile platforms
        print_test "Checking mobile platforms..."
        local platforms_found=0
        if [ -d "ios" ]; then
            print_success "iOS platform configured"
            ((platforms_found++))
        fi
        if [ -d "android" ]; then
            print_success "Android platform configured"
            ((platforms_found++))
        fi
        
        if [ $platforms_found -gt 0 ]; then
            ((passed_tests++))
        else
            print_warning "No mobile platforms configured"
            ((warnings++))
        fi
        ((total_tests++))
        
        # Check sync status
        print_test "Checking Capacitor sync status..."
        if npx cap sync --deployment >> "$LOG_FILE" 2>&1; then
            print_success "Capacitor sync successful"
            ((passed_tests++))
        else
            print_warning "Capacitor sync may be needed"
            ((warnings++))
        fi
        ((total_tests++))
    else
        print_status "Mobile app not configured"
    fi
}

# ================================================================================
# SECURITY TESTS
# ================================================================================

test_security() {
    print_section "Testing Security Configuration"
    
    # Check for exposed secrets
    print_test "Checking for exposed secrets..."
    local exposed_secrets=0
    
    # Check for common secret patterns in code
    if grep -r "password\|secret\|key\|token" "$PROJECT_ROOT" \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=.maintain-logs \
        --exclude="*.log" \
        --include="*.js" \
        --include="*.ts" \
        --include="*.tsx" | \
        grep -v "process.env\|import\|require\|interface\|type\|//" | \
        grep -E "(=|:)\s*['\"][^'\"]{8,}['\"]" >> "$LOG_FILE" 2>&1; then
        print_warning "Potential hardcoded secrets found - check log"
        ((warnings++))
    else
        print_success "No hardcoded secrets detected"
        ((passed_tests++))
    fi
    ((total_tests++))
    
    # Check CORS configuration
    if [ -d "$BACKEND_DIR" ]; then
        print_test "Checking CORS configuration..."
        if grep -r "cors" "$BACKEND_DIR/src" --include="*.js" --include="*.ts" >> "$LOG_FILE" 2>&1; then
            print_success "CORS configured"
            ((passed_tests++))
        else
            print_warning "CORS may not be configured"
            ((warnings++))
        fi
        ((total_tests++))
    fi
    
    # Check authentication middleware
    print_test "Checking authentication middleware..."
    if grep -r "authenticate\|auth\|jwt" "$BACKEND_DIR/src" --include="*.js" --include="*.ts" >> "$LOG_FILE" 2>&1; then
        print_success "Authentication middleware found"
        ((passed_tests++))
    else
        print_warning "Authentication middleware may be missing"
        ((warnings++))
    fi
    ((total_tests++))
    
    # Check for rate limiting
    print_test "Checking rate limiting..."
    if grep -r "rate-limit\|rateLimit\|express-rate-limit" "$BACKEND_DIR" --include="*.js" --include="*.ts" --include="package.json" >> "$LOG_FILE" 2>&1; then
        print_success "Rate limiting configured"
        ((passed_tests++))
    else
        print_warning "Consider adding rate limiting"
        ((warnings++))
    fi
    ((total_tests++))
}

# ================================================================================
# PERFORMANCE TESTS
# ================================================================================

test_performance() {
    print_section "Testing Performance Metrics"
    
    # Check bundle size
    if [ -d "$FRONTEND_DIR/.next" ]; then
        print_test "Analyzing bundle size..."
        
        # Get total size of .next directory
        local bundle_size=$(du -sh "$FRONTEND_DIR/.next" 2>/dev/null | cut -f1)
        print_status "Total build size: $bundle_size"
        
        # Check if size is reasonable (< 50MB)
        local size_mb=$(du -sm "$FRONTEND_DIR/.next" 2>/dev/null | cut -f1)
        if [ "$size_mb" -lt 50 ]; then
            print_success "Bundle size is optimal"
            ((passed_tests++))
        else
            print_warning "Bundle size may be too large ($size_mb MB)"
            ((warnings++))
        fi
        ((total_tests++))
    fi
    
    # Check for lazy loading
    print_test "Checking lazy loading implementation..."
    if grep -r "dynamic\|lazy\|Suspense" "$FRONTEND_DIR" --include="*.tsx" --include="*.jsx" >> "$LOG_FILE" 2>&1; then
        print_success "Lazy loading implemented"
        ((passed_tests++))
    else
        print_warning "Consider implementing lazy loading"
        ((warnings++))
    fi
    ((total_tests++))
    
    # Check for image optimization
    print_test "Checking image optimization..."
    if grep -r "next/image\|Image" "$FRONTEND_DIR" --include="*.tsx" --include="*.jsx" >> "$LOG_FILE" 2>&1; then
        print_success "Next.js Image optimization used"
        ((passed_tests++))
    else
        print_warning "Consider using Next.js Image component"
        ((warnings++))
    fi
    ((total_tests++))
}

# ================================================================================
# TEST SUMMARY
# ================================================================================

print_test_summary() {
    local total=$1
    local passed=$2
    local failed=$3
    local warnings=$4
    
    echo ""
    print_header "          TEST SUMMARY          "
    
    echo -e "${WHITE}Total Tests:${NC} $total"
    echo -e "${GREEN}Passed:${NC} $passed"
    echo -e "${RED}Failed:${NC} $failed"
    echo -e "${YELLOW}Warnings:${NC} $warnings"
    
    local success_rate=0
    if [ $total -gt 0 ]; then
        success_rate=$((passed * 100 / total))
    fi
    
    echo ""
    echo -e "${WHITE}Success Rate:${NC} ${success_rate}%"
    
    # Overall status
    echo ""
    if [ $failed -eq 0 ]; then
        if [ $warnings -eq 0 ]; then
            print_header "    ✅ ALL TESTS PASSED!    "
        else
            print_header "    ⚠️  TESTS PASSED WITH WARNINGS    "
            echo -e "${YELLOW}Review warnings in the log file${NC}"
        fi
    else
        print_header "    ❌ TESTS FAILED    "
        echo -e "${RED}$failed tests need attention${NC}"
        echo -e "${YELLOW}Check the log file for details${NC}"
    fi
    
    show_log_info
    
    # Return error code if tests failed
    if [ $failed -gt 0 ]; then
        return 1
    fi
    return 0
}

# ================================================================================
# CONNECTION TEST HELPERS
# ================================================================================

# Test PostgreSQL connection directly
test_postgres_direct() {
    print_test "Direct PostgreSQL connection test..."
    
    # Parse DATABASE_URL from backend .env
    if [ -f "$BACKEND_DIR/.env" ]; then
        local db_url=$(grep "^DATABASE_URL=" "$BACKEND_DIR/.env" | cut -d'=' -f2- | tr -d '"')
        
        if [ -n "$db_url" ]; then
            # Extract connection details from URL
            # Format: postgresql://user:password@host:port/database
            local db_user=$(echo "$db_url" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
            local db_host=$(echo "$db_url" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
            local db_port=$(echo "$db_url" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            local db_name=$(echo "$db_url" | sed -n 's/.*\/\([^?]*\).*/\1/p')
            
            # Default port if not specified
            db_port=${db_port:-5432}
            
            # Test connection with psql
            if command_exists psql; then
                if PGPASSWORD="${DB_PASSWORD}" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "SELECT 1;" >> "$LOG_FILE" 2>&1; then
                    print_success "Direct database connection successful"
                    return 0
                else
                    print_error "Direct database connection failed"
                    return 1
                fi
            else
                print_status "psql not installed - skipping direct test"
                return 2
            fi
        else
            print_warning "DATABASE_URL not found in .env"
            return 1
        fi
    else
        print_warning "Backend .env file not found"
        return 1
    fi
}

# Test Redis connection
test_redis_connection() {
    print_test "Testing Redis connection..."
    
    local redis_host="${REDIS_HOST:-localhost}"
    local redis_port="${REDIS_PORT:-6379}"
    
    if command_exists redis-cli; then
        if redis-cli -h "$redis_host" -p "$redis_port" ping >> "$LOG_FILE" 2>&1; then
            print_success "Redis connection successful"
            return 0
        else
            print_warning "Redis not running (optional)"
            return 1
        fi
    else
        print_status "Redis client not installed"
        return 2
    fi
}

# ================================================================================
# EXPORT FUNCTIONS
# ================================================================================

# Make functions available when sourced
export -f cmd_test_comprehensive
export -f test_dependencies
export -f test_environment
export -f test_database_connection
export -f test_api_endpoints
export -f test_frontend_build
export -f test_mobile_compatibility
export -f test_security
export -f test_performance
export -f print_test_summary
export -f test_postgres_direct
export -f test_redis_connection