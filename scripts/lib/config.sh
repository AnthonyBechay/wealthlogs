#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                       Configuration Management Functions                       ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# Source common functions
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

# ================================================================================
# CONFIG COMMANDS
# ================================================================================

# Show configuration
cmd_config_show() {
    print_header "        CURRENT CONFIGURATION        "
    
    local config_file="$CONFIG_FILE"
    
    if [ ! -f "$config_file" ]; then
        print_error "Configuration file not found"
        print_status "Run: ./maintain.sh config create"
        return 1
    fi
    
    print_section "Environment Settings"
    echo -e "  ${WHITE}Environment:${NC} ${CYAN}${ENVIRONMENT:-development}${NC}"
    echo ""
    
    print_section "Database Configuration"
    echo -e "  ${WHITE}Host:${NC} ${CYAN}${DB_HOST:-localhost}${NC}"
    echo -e "  ${WHITE}Port:${NC} ${CYAN}${DB_PORT:-5432}${NC}"
    echo -e "  ${WHITE}Database:${NC} ${CYAN}${DB_NAME:-wealthlog}${NC}"
    echo -e "  ${WHITE}Username:${NC} ${CYAN}${DB_USERNAME:-postgres}${NC}"
    echo -e "  ${WHITE}Password:${NC} ${GRAY}[hidden]${NC}"
    echo ""
    
    print_section "Development Ports"
    echo -e "  ${WHITE}Frontend:${NC} ${CYAN}${DEV_FRONTEND_PORT:-3000}${NC}"
    echo -e "  ${WHITE}Backend:${NC} ${CYAN}${DEV_BACKEND_PORT:-5000}${NC}"
    echo -e "  ${WHITE}Mobile:${NC} ${CYAN}${DEV_MOBILE_PORT:-3003}${NC}"
    echo ""
    
    print_section "Production URLs"
    echo -e "  ${WHITE}Frontend:${NC} ${CYAN}${PROD_FRONTEND_URL}${NC}"
    echo -e "  ${WHITE}Backend:${NC} ${CYAN}${PROD_BACKEND_URL}${NC}"
    echo ""
    
    if [ "$ENVIRONMENT" = "staging" ]; then
        print_section "Staging URLs"
        echo -e "  ${WHITE}Frontend:${NC} ${CYAN}${STAGING_FRONTEND_URL}${NC}"
        echo -e "  ${WHITE}Backend:${NC} ${CYAN}${STAGING_BACKEND_URL}${NC}"
        echo ""
    fi
    
    print_section "Security Status"
    
    # Check if secrets are configured
    if [ -n "$JWT_ACCESS_SECRET" ] && [ "$JWT_ACCESS_SECRET" != "" ]; then
        print_success "JWT secrets configured"
    else
        print_warning "JWT secrets need configuration"
    fi
    
    if [ "$GOOGLE_CLIENT_ID" != "your-google-client-id.apps.googleusercontent.com" ]; then
        print_success "Google OAuth configured"
    else
        print_warning "Google OAuth not configured"
    fi
    
    echo ""
    print_status "Config file: ${CYAN}$config_file${NC}"
}

# Edit configuration  
cmd_config_edit() {
    local config_file="$CONFIG_FILE"
    
    if [ ! -f "$config_file" ]; then
        print_warning "Configuration file not found. Creating default..."
        cmd_config_create
        # Return after creation - user can run edit again
        print_status "Run 'config edit' again to open the file"
        return 0
    fi
    
    # Determine editor
    local editor=""
    
    if [ -n "$EDITOR" ]; then
        editor="$EDITOR"
    elif command_exists code; then
        editor="code"
    elif command_exists nano; then
        editor="nano"
    elif command_exists vim; then
        editor="vim"
    elif is_git_bash || [[ "$(get_os)" == "windows" ]]; then
        # On Windows, try to use notepad or VS Code
        if command_exists code; then
            editor="code"
        else
            editor="notepad"
        fi
    else
        print_error "No text editor found"
        print_status "Please edit manually: $config_file"
        return 1
    fi
    
    print_status "Opening config in $editor..."
    
    # Handle different editors properly
    if [ "$editor" = "code" ]; then
        # VS Code - wait for window to close
        code --wait "$config_file" 2>/dev/null || code "$config_file"
    elif [ "$editor" = "notepad" ]; then
        # Windows notepad
        notepad "$config_file"
    else
        # Unix editors
        $editor "$config_file"
    fi
    
    # Reload config
    if load_config "$config_file"; then
        print_success "Configuration reloaded"
    fi
}

# Validate configuration
cmd_config_validate() {
    print_header "      VALIDATING CONFIGURATION      "
    
    local errors=0
    
    # Load config
    if ! load_config; then
        print_error "Failed to load configuration"
        return 1
    fi
    
    print_section "Checking Database Configuration"
    
    # Test database connection
    if command_exists psql; then
        print_test "Testing database connection..."
        
        export PGPASSWORD="$DB_PASSWORD"
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d postgres -c '\q' 2>/dev/null; then
            print_success "Database connection successful"
        else
            print_warning "Cannot connect to database"
            print_status "Check your database settings"
            errors=$((errors + 1))
        fi
        unset PGPASSWORD
    else
        print_warning "psql not found - skipping database test"
    fi
    
    print_section "Checking Paths"
    
    # Check directories
    [ -d "$BACKEND_DIR" ] && print_success "Backend directory exists" || { print_error "Backend directory not found"; errors=$((errors + 1)); }
    [ -d "$FRONTEND_DIR" ] && print_success "Frontend directory exists" || { print_error "Frontend directory not found"; errors=$((errors + 1)); }
    [ -d "$SHARED_DIR" ] && print_success "Shared directory exists" || print_warning "Shared directory not found"
    
    print_section "Checking Ports"
    
    # Check if ports are available
    if port_in_use "$DEV_FRONTEND_PORT"; then
        print_warning "Frontend port $DEV_FRONTEND_PORT is in use"
    else
        print_success "Frontend port $DEV_FRONTEND_PORT is available"
    fi
    
    if port_in_use "$DEV_BACKEND_PORT"; then
        print_warning "Backend port $DEV_BACKEND_PORT is in use"
    else
        print_success "Backend port $DEV_BACKEND_PORT is available"
    fi
    
    print_section "Checking Security"
    
    # Check JWT secrets
    if [ -z "$JWT_ACCESS_SECRET" ] || [ "$JWT_ACCESS_SECRET" = "" ]; then
        print_warning "JWT_ACCESS_SECRET not set (will be auto-generated)"
    else
        local secret_length=${#JWT_ACCESS_SECRET}
        if [ $secret_length -lt 32 ]; then
            print_warning "JWT_ACCESS_SECRET is short (recommended: 32+ chars)"
        else
            print_success "JWT_ACCESS_SECRET is secure"
        fi
    fi
    
    # Check if using default passwords
    if [ "$DB_PASSWORD" = "password" ]; then
        print_warning "Using default database password"
        errors=$((errors + 1))
    fi
    
    # Summary
    echo ""
    if [ $errors -eq 0 ]; then
        print_success "Configuration is valid!"
    else
        print_warning "Found $errors configuration issue(s)"
        print_status "Run: ./maintain.sh config edit"
    fi
    
    return $errors
}

# Create default configuration
cmd_config_create() {
    local config_file="$CONFIG_FILE"
    
    if [ -f "$config_file" ]; then
        print_warning "Configuration file already exists"
        read -p "Overwrite? (y/N): " overwrite
        if [ "$overwrite" != "y" ]; then
            return 0
        fi
    fi
    
    print_header "    CREATING DEFAULT CONFIGURATION    "
    
    # Generate secrets
    local jwt_access=$(openssl rand -hex 32 2>/dev/null || echo "dev_access_secret_$(date +%s)")
    local jwt_refresh=$(openssl rand -hex 32 2>/dev/null || echo "dev_refresh_secret_$(date +%s)")
    local session=$(openssl rand -hex 32 2>/dev/null || echo "dev_session_secret_$(date +%s)")
    
    cat > "$config_file" << EOF
#!/bin/bash
# WealthLog Configuration File
# Generated: $(date)

# ================================================================================
# ENVIRONMENT SETTINGS
# ================================================================================

ENVIRONMENT="development"

# ================================================================================
# DATABASE CONFIGURATION
# ================================================================================

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="wealthlog"
DB_USERNAME="postgres"
DB_PASSWORD="password"  # CHANGE THIS!

# ================================================================================
# DEPLOYMENT URLS
# ================================================================================

PROD_FRONTEND_URL="https://wealthlogs.com"
PROD_BACKEND_URL="https://wealthlog-backend-hx43.onrender.com"

STAGING_FRONTEND_URL="https://staging.wealthlogs.com"
STAGING_BACKEND_URL="https://staging-api.wealthlogs.com"

# ================================================================================
# DEVELOPMENT PORTS
# ================================================================================

DEV_FRONTEND_PORT="3000"
DEV_BACKEND_PORT="5000"
DEV_MOBILE_PORT="3003"

# ================================================================================
# AUTHENTICATION SECRETS
# ================================================================================

JWT_ACCESS_SECRET="$jwt_access"
JWT_REFRESH_SECRET="$jwt_refresh"
SESSION_SECRET="$session"

GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# ================================================================================
# TEST ACCOUNTS
# ================================================================================

TEST_USERNAME="bech"
TEST_PASSWORD="123"
TEST_EMAIL="test@example.com"

# ================================================================================
# OPTIONAL FEATURES
# ================================================================================

REQUIRE_EMAIL_VERIFICATION="false"
REDIS_ENABLED="false"
SENTRY_ENABLED="false"

# ================================================================================
# MOBILE APP
# ================================================================================

IOS_BUNDLE_ID="com.wealthlogs.app"
ANDROID_PACKAGE_NAME="com.wealthlogs.app"

CONFIG_VERSION="2.0.0"
CONFIG_UPDATED="$(date +%Y-%m-%d)"
EOF
    
    print_success "Configuration file created"
    print_status "Location: $config_file"
    echo ""
    print_warning "Important: Edit the configuration file to set:"
    echo -e "  1. ${YELLOW}Database password${NC}"
    echo -e "  2. ${YELLOW}Google OAuth credentials${NC}"
    echo -e "  3. ${YELLOW}Production URLs${NC} (if different)"
    echo ""
    print_status "Run: ${CYAN}./maintain.sh config edit${NC}"
}

# Export configuration to environment files
cmd_config_export() {
    print_header "    EXPORTING CONFIGURATION    "
    
    if ! load_config; then
        print_error "Failed to load configuration"
        return 1
    fi
    
    print_section "Creating Backend .env"
    
    cat > "$BACKEND_DIR/.env" << EOF
# Environment
NODE_ENV=${ENVIRONMENT}
PORT=${DEV_BACKEND_PORT}

# Database
DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

# JWT Secrets
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
SESSION_SECRET=${SESSION_SECRET}
SECRET_KEY=${JWT_ACCESS_SECRET}

# Google OAuth
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
GOOGLE_CALLBACK_URL=http://localhost:${DEV_BACKEND_PORT}/api/auth/google/callback

# URLs
FRONTEND_URL=http://localhost:${DEV_FRONTEND_PORT}
ALLOWED_ORIGINS=http://localhost:${DEV_FRONTEND_PORT},http://localhost:${DEV_MOBILE_PORT}

# Features
REQUIRE_EMAIL_VERIFICATION=${REQUIRE_EMAIL_VERIFICATION}

# Redis (if enabled)
$([ "$REDIS_ENABLED" = "true" ] && echo "REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}")

# Sentry (if enabled)
$([ "$SENTRY_ENABLED" = "true" ] && echo "SENTRY_DSN=${SENTRY_DSN}")
EOF
    
    print_success "Backend .env created"
    
    print_section "Creating Frontend .env.local"
    
    cat > "$FRONTEND_DIR/.env.local" << EOF
NEXT_PUBLIC_API_URL=http://localhost:${DEV_BACKEND_PORT}
NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}

# Sentry (if enabled)
$([ "$SENTRY_ENABLED" = "true" ] && echo "NEXT_PUBLIC_SENTRY_DSN=${SENTRY_DSN}")
EOF
    
    print_success "Frontend .env.local created"
    
    if [ -d "$MOBILE_DIR" ]; then
        print_section "Creating Mobile .env"
        
        cat > "$MOBILE_DIR/.env" << EOF
REACT_APP_API_URL=http://localhost:${DEV_BACKEND_PORT}
REACT_APP_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
EOF
        
        print_success "Mobile .env created"
    fi
    
    echo ""
    print_success "Configuration exported to all apps!"
}

# Main config command handler
cmd_config() {
    case "$1" in
        show|"")
            cmd_config_show
            ;;
        edit)
            cmd_config_edit
            ;;
        validate|check)
            cmd_config_validate
            ;;
        create|init)
            cmd_config_create
            ;;
        export|apply)
            cmd_config_export
            ;;
        *)
            print_error "Unknown config command: $1"
            echo ""
            echo "Available commands:"
            echo "  config show     - Show current configuration"
            echo "  config edit     - Edit configuration file"
            echo "  config validate - Validate configuration"
            echo "  config create   - Create default configuration"
            echo "  config export   - Export to .env files"
            ;;
    esac
}
