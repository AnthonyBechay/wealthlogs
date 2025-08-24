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
    
    # Try normal install first, then with legacy-peer-deps if it fails
    if npm install >> "$LOG_FILE" 2>&1; then
        print_success "$name dependencies installed"
        return 0
    else
        print_warning "Retrying with --legacy-peer-deps..."
        if npm install --legacy-peer-deps >> "$LOG_FILE" 2>&1; then
            print_success "$name dependencies installed (with legacy peer deps)"
            return 0
        else
            print_error "$name dependencies installation failed"
            return 1
        fi
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
    
    # Install root dependencies first (includes turbo)
    if [ -f "$PROJECT_ROOT/wealthlogs-code/package.json" ]; then
        cd "$PROJECT_ROOT/wealthlogs-code"
        if ! check_dependencies_installed "$PROJECT_ROOT/wealthlogs-code"; then
            print_status "Installing root dependencies (this includes all workspace packages)..."
            # Try normal install first, then with legacy-peer-deps if it fails
            if npm install >> "$LOG_FILE" 2>&1; then
                print_success "Root dependencies installed"
            else
                print_warning "Retrying with --legacy-peer-deps due to dependency conflicts..."
                if npm install --legacy-peer-deps >> "$LOG_FILE" 2>&1; then
                    print_success "Root dependencies installed (with legacy peer deps)"
                else
                    print_error "Root dependencies installation failed"
                    errors=$((errors + 1))
                fi
            fi
        else
            print_success "Root dependencies already installed"
            # Even if installed, run npm install to ensure all workspaces are linked
            print_status "Ensuring all workspace packages are linked..."
            npm install --legacy-peer-deps >> "$LOG_FILE" 2>&1
        fi
    fi
    
    # Install common package dependencies if needed
    if [ -d "$PROJECT_ROOT/wealthlogs-code/packages/common" ]; then
        if [ ! -d "$PROJECT_ROOT/wealthlogs-code/packages/common/node_modules" ]; then
            cd "$PROJECT_ROOT/wealthlogs-code/packages/common"
            print_status "Setting up common package..."
            npm install >> "$LOG_FILE" 2>&1
            print_success "Common package ready"
        fi
    fi
    
    # Build shared package if needed
    if [ -d "$SHARED_DIR" ]; then
        cd "$SHARED_DIR"
        if [ -f "package.json" ]; then
            print_status "Building shared package..."
            npm run build >> "$LOG_FILE" 2>&1 || true
            print_success "Shared package built"
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
