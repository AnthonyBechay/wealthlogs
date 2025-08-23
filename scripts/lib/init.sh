#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                        Initialization and Dependency Functions                 ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# Source common functions
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

# ================================================================================
# DEPENDENCY MANAGEMENT
# ================================================================================

# Check if dependencies are installed
check_dependencies_installed() {
    local dir="$1"
    
    if [ -d "$dir/node_modules" ]; then
        # Check if node_modules has content
        local count=$(ls "$dir/node_modules" 2>/dev/null | wc -l)
        if [ $count -gt 0 ]; then
            return 0  # Dependencies installed
        fi
    fi
    return 1  # Dependencies not installed
}

# Install dependencies for a specific directory
install_dependencies() {
    local dir="$1"
    local name="$2"
    
    if [ ! -f "$dir/package.json" ]; then
        print_error "$name package.json not found"
        return 1
    fi
    
    cd "$dir"
    
    print_status "Installing $name dependencies..."
    
    # Use --yes flag to auto-accept prompts
    if npm install --yes >> "$LOG_FILE" 2>&1; then
        print_success "$name dependencies installed"
        return 0
    else
        print_error "$name dependencies installation failed"
        return 1
    fi
}

# Ensure TypeScript is installed locally
ensure_typescript() {
    local dir="$1"
    
    cd "$dir"
    
    # Check if TypeScript is installed
    if [ ! -f "node_modules/typescript/bin/tsc" ]; then
        print_status "Installing TypeScript..."
        npm install --save-dev typescript --yes >> "$LOG_FILE" 2>&1
    fi
}

# Initialize all dependencies
init_all_dependencies() {
    print_header "    INSTALLING ALL DEPENDENCIES    "
    
    local errors=0
    
    # Install root dependencies
    if [ -f "$PROJECT_ROOT/wealthlogs-code/package.json" ]; then
        if ! check_dependencies_installed "$PROJECT_ROOT/wealthlogs-code"; then
            install_dependencies "$PROJECT_ROOT/wealthlogs-code" "Root" || errors=$((errors + 1))
        else
            print_success "Root dependencies already installed"
        fi
    fi
    
    # Install backend dependencies
    if [ -d "$BACKEND_DIR" ]; then
        if ! check_dependencies_installed "$BACKEND_DIR"; then
            install_dependencies "$BACKEND_DIR" "Backend" || errors=$((errors + 1))
        else
            print_success "Backend dependencies already installed"
        fi
    fi
    
    # Install frontend dependencies
    if [ -d "$FRONTEND_DIR" ]; then
        if ! check_dependencies_installed "$FRONTEND_DIR"; then
            install_dependencies "$FRONTEND_DIR" "Frontend" || errors=$((errors + 1))
        else
            print_success "Frontend dependencies already installed"
        fi
        # Ensure TypeScript is installed
        ensure_typescript "$FRONTEND_DIR"
    fi
    
    # Install shared dependencies
    if [ -d "$SHARED_DIR" ]; then
        if ! check_dependencies_installed "$SHARED_DIR"; then
            install_dependencies "$SHARED_DIR" "Shared" || errors=$((errors + 1))
        else
            print_success "Shared dependencies already installed"
        fi
        # Ensure TypeScript is installed
        ensure_typescript "$SHARED_DIR"
    fi
    
    # Install mobile dependencies if exists
    if [ -d "$MOBILE_DIR" ]; then
        if ! check_dependencies_installed "$MOBILE_DIR"; then
            install_dependencies "$MOBILE_DIR" "Mobile" || errors=$((errors + 1))
        else
            print_success "Mobile dependencies already installed"
        fi
    fi
    
    return $errors
}

# Quick dependency check
quick_dependency_check() {
    local all_good=true
    
    if ! check_dependencies_installed "$PROJECT_ROOT/wealthlogs-code"; then
        print_warning "Root dependencies not installed"
        all_good=false
    fi
    
    if ! check_dependencies_installed "$BACKEND_DIR"; then
        print_warning "Backend dependencies not installed"
        all_good=false
    fi
    
    if ! check_dependencies_installed "$FRONTEND_DIR"; then
        print_warning "Frontend dependencies not installed"
        all_good=false
    fi
    
    if ! check_dependencies_installed "$SHARED_DIR"; then
        print_warning "Shared dependencies not installed"
        all_good=false
    fi
    
    if [ "$all_good" = false ]; then
        print_warning "Some dependencies are missing"
        print_status "Run: ./maintain.sh init"
        return 1
    fi
    
    return 0
}
