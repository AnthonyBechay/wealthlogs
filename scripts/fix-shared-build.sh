#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                     WealthLog Shared Package Build Fix                        ║
# ║                          Fix TypeScript build issues                          ║
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
SHARED_DIR="$PROJECT_ROOT/wealthlogs-code/packages/shared"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      WealthLog Shared Package Build Fix                            ║${NC}"
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

# ============================================================================
# FIX SHARED PACKAGE
# ============================================================================

cd "$SHARED_DIR"

print_status "Cleaning shared package..."
rm -rf node_modules package-lock.json dist

print_status "Installing dependencies..."
npm install

# Ensure @types/node is installed
print_status "Ensuring @types/node is installed..."
npm install @types/node@^20.0.0

print_status "Building shared package..."
if npm run build; then
    print_success "Shared package built successfully!"
    
    # Verify build output
    if [ -d "dist" ]; then
        FILE_COUNT=$(find dist -type f | wc -l)
        print_success "Generated $FILE_COUNT files in dist/"
    fi
else
    print_error "Build failed"
    exit 1
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    BUILD SUCCESSFUL!                               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╗${NC}"
echo ""

print_success "Shared package is now ready for use!"
echo ""
echo "Next steps:"
echo "1. Install other packages:"
echo "   cd ../../apps/backend && npm install --legacy-peer-deps"
echo "   cd ../web && npm install --legacy-peer-deps"
echo ""
echo "2. Commit and push:"
echo "   git add ."
echo "   git commit -m 'fix: shared package TypeScript build'"
echo "   git push"
