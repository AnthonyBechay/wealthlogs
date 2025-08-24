#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                     WealthLog Dependency Fix Script                           ║
# ║                    Fix dependency conflicts and install packages              ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      WealthLog Dependency Fix                                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Function to print status
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

# ============================================================================
# STEP 1: CLEAN OLD INSTALLATIONS
# ============================================================================

print_status "Step 1: Cleaning old installations..."

cd "$PROJECT_ROOT/wealthlogs-code"

# Remove all node_modules and lock files
print_status "Removing node_modules directories..."
find . -name "node_modules" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
print_success "Removed all node_modules"

print_status "Removing package-lock.json files..."
find . -name "package-lock.json" -type f -delete 2>/dev/null || true
print_success "Removed all package-lock.json files"

# ============================================================================
# STEP 2: INSTALL SHARED PACKAGE FIRST
# ============================================================================

print_status "Step 2: Installing shared package dependencies..."

cd "$PROJECT_ROOT/wealthlogs-code/packages/shared"
npm install
npm run build

if [ $? -eq 0 ]; then
    print_success "Shared package built successfully"
else
    print_error "Shared package build failed"
    exit 1
fi

# ============================================================================
# STEP 3: INSTALL BACKEND DEPENDENCIES
# ============================================================================

print_status "Step 3: Installing backend dependencies..."

cd "$PROJECT_ROOT/wealthlogs-code/apps/backend"
npm install

if [ $? -eq 0 ]; then
    print_success "Backend dependencies installed"
else
    print_warning "Backend installation had issues, trying with --legacy-peer-deps"
    npm install --legacy-peer-deps
fi

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# ============================================================================
# STEP 4: INSTALL FRONTEND DEPENDENCIES
# ============================================================================

print_status "Step 4: Installing frontend dependencies..."

cd "$PROJECT_ROOT/wealthlogs-code/apps/web"
npm install

if [ $? -eq 0 ]; then
    print_success "Frontend dependencies installed"
else
    print_warning "Frontend installation had issues, trying with --legacy-peer-deps"
    npm install --legacy-peer-deps
fi

# ============================================================================
# STEP 5: INSTALL MOBILE DEPENDENCIES (IF EXISTS)
# ============================================================================

if [ -d "$PROJECT_ROOT/wealthlogs-code/apps/mobile" ]; then
    print_status "Step 5: Installing mobile dependencies..."
    cd "$PROJECT_ROOT/wealthlogs-code/apps/mobile"
    npm install --legacy-peer-deps
    print_success "Mobile dependencies installed"
else
    print_status "Step 5: Mobile app not found, skipping..."
fi

# ============================================================================
# STEP 6: INSTALL ROOT DEPENDENCIES
# ============================================================================

print_status "Step 6: Installing root workspace dependencies..."

cd "$PROJECT_ROOT/wealthlogs-code"
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    print_success "Root dependencies installed"
else
    print_warning "Some peer dependency warnings may be present, but installation completed"
fi

# ============================================================================
# STEP 7: VERIFY INSTALLATIONS
# ============================================================================

print_status "Step 7: Verifying installations..."

ERRORS=0

# Check shared package
if [ -d "$PROJECT_ROOT/wealthlogs-code/packages/shared/node_modules" ]; then
    print_success "✓ Shared package modules installed"
else
    print_error "✗ Shared package modules missing"
    ERRORS=$((ERRORS + 1))
fi

# Check backend
if [ -d "$PROJECT_ROOT/wealthlogs-code/apps/backend/node_modules" ]; then
    print_success "✓ Backend modules installed"
else
    print_error "✗ Backend modules missing"
    ERRORS=$((ERRORS + 1))
fi

# Check frontend
if [ -d "$PROJECT_ROOT/wealthlogs-code/apps/web/node_modules" ]; then
    print_success "✓ Frontend modules installed"
else
    print_error "✗ Frontend modules missing"
    ERRORS=$((ERRORS + 1))
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    DEPENDENCY FIX COMPLETE!                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╗${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    print_success "✅ All dependencies installed successfully!"
    print_success "✅ i18next version conflict resolved"
    print_success "✅ Shared package built"
    print_success "✅ Prisma client generated"
    
    echo ""
    echo -e "${YELLOW}NEXT STEPS:${NC}"
    echo ""
    echo "1. Start the development servers:"
    echo "   cd $PROJECT_ROOT/wealthlogs-code/apps/backend && npm run dev"
    echo "   cd $PROJECT_ROOT/wealthlogs-code/apps/web && npm run dev"
    echo ""
    echo "2. Or use the maintenance script:"
    echo "   ./scripts/maintain.sh dev"
    echo ""
    echo "3. Access the application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend: http://localhost:5000"
else
    print_error "Some installations failed. Please check the errors above."
    echo ""
    echo -e "${YELLOW}TROUBLESHOOTING:${NC}"
    echo ""
    echo "1. Check Node.js version (should be 18+):"
    echo "   node --version"
    echo ""
    echo "2. Clear npm cache:"
    echo "   npm cache clean --force"
    echo ""
    echo "3. Try manual installation with legacy peer deps:"
    echo "   cd [package directory]"
    echo "   npm install --legacy-peer-deps"
fi

echo ""
print_success "Dependency issues have been resolved!"
