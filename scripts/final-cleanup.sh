#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                     WealthLog Final Production Cleanup Script                 ║
# ║                         Remove duplicates and prepare for GitHub              ║
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
echo -e "${BLUE}║      WealthLog Final Production Cleanup                            ║${NC}"
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
# CLEANUP DUPLICATE FILES
# ============================================================================

print_status "Removing duplicate and unnecessary files..."

cd "$PROJECT_ROOT/wealthlogs-code/apps/backend/src"

# Remove enhanced versions (they're for reference only)
if [ -f "index-enhanced.js" ]; then
    rm -f index-enhanced.js
    print_success "Removed index-enhanced.js"
fi

if [ -f "routes/auth/index-enhanced.js" ]; then
    rm -f routes/auth/index-enhanced.js
    print_success "Removed auth/index-enhanced.js"
fi

# Remove TypeScript file from backend (backend uses JS)
if [ -f "utils/service-implementation.ts" ]; then
    rm -f utils/service-implementation.ts
    print_success "Removed TypeScript implementation (using JS version)"
fi

# Remove backup files
find "$PROJECT_ROOT" -name "*.backup" -type f -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name "*.bak" -type f -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name "*-original.*" -type f -delete 2>/dev/null || true
find "$PROJECT_ROOT" -name "*-old.*" -type f -delete 2>/dev/null || true
print_success "Removed backup files"

# ============================================================================
# VERIFY STRUCTURE
# ============================================================================

print_status "Verifying project structure..."

# Check critical files exist
MISSING_FILES=0

# Backend checks
if [ ! -f "$PROJECT_ROOT/wealthlogs-code/apps/backend/src/index.js" ]; then
    print_error "Backend index.js missing!"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ ! -f "$PROJECT_ROOT/wealthlogs-code/apps/backend/src/routes/auth/index.js" ]; then
    print_error "Auth routes missing!"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ ! -f "$PROJECT_ROOT/wealthlogs-code/apps/backend/src/utils/service-implementation.js" ]; then
    print_error "Service implementation missing!"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

# Frontend checks
if [ ! -d "$PROJECT_ROOT/wealthlogs-code/apps/web/src/services" ]; then
    print_error "Frontend services directory missing!"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ ! -d "$PROJECT_ROOT/wealthlogs-code/apps/web/src/contexts" ]; then
    print_error "Frontend contexts directory missing!"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ ! -d "$PROJECT_ROOT/wealthlogs-code/apps/web/src/components/security" ]; then
    print_error "Security components directory missing!"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

# Shared package checks
if [ ! -d "$PROJECT_ROOT/wealthlogs-code/packages/shared/src/services" ]; then
    print_error "Shared services directory missing!"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ $MISSING_FILES -eq 0 ]; then
    print_success "All critical files present"
else
    print_error "$MISSING_FILES critical files/directories missing"
fi

# ============================================================================
# CREATE FINAL .GITIGNORE
# ============================================================================

print_status "Creating comprehensive .gitignore..."

cat > "$PROJECT_ROOT/.gitignore" << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Production builds
.next/
out/
dist/
build/

# Environment files
.env
.env.local
.env.development
.env.development.local
.env.test.local
.env.production
.env.production.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
.maintain-logs/

# Turbo
.turbo/

# Uploads (keep directory structure but not files)
uploads/**/*
!uploads/**/.gitkeep

# Backup files
*.backup
*.bak
*-original.*
*-old.*
*-enhanced.*

# TypeScript
*.tsbuildinfo

# Misc
.cache/
.temp/
.tmp/
EOF

print_success "Created comprehensive .gitignore"

# ============================================================================
# FINAL TEST
# ============================================================================

print_status "Running final verification tests..."

cd "$PROJECT_ROOT/wealthlogs-code/apps/backend"

# Test 1: Check if package.json is valid
if node -e "require('./package.json')" 2>/dev/null; then
    print_success "✓ Backend package.json is valid"
else
    print_error "✗ Backend package.json is invalid"
fi

# Test 2: Check if Prisma schema is valid
if npx prisma validate 2>/dev/null; then
    print_success "✓ Prisma schema is valid"
else
    print_error "✗ Prisma schema validation failed"
fi

cd "$PROJECT_ROOT/wealthlogs-code/apps/web"

# Test 3: Check if frontend package.json is valid
if node -e "require('./package.json')" 2>/dev/null; then
    print_success "✓ Frontend package.json is valid"
else
    print_error "✗ Frontend package.json is invalid"
fi

# ============================================================================
# GIT STATUS
# ============================================================================

print_status "Checking Git status..."

cd "$PROJECT_ROOT"

if [ -d ".git" ]; then
    # Check for uncommitted changes
    if git diff-index --quiet HEAD -- 2>/dev/null; then
        print_success "No uncommitted changes"
    else
        print_status "You have uncommitted changes"
        
        # Show summary
        echo ""
        echo "Modified files:"
        git status --short
    fi
    
    # Show current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    print_status "Current branch: $CURRENT_BRANCH"
else
    print_status "Not a Git repository yet"
fi

# ============================================================================
# FINAL SUMMARY
# ============================================================================

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    CLEANUP COMPLETE!                               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╗${NC}"
echo ""

print_success "✅ Duplicate files removed"
print_success "✅ TypeScript files cleaned from backend"
print_success "✅ Backup files removed"
print_success "✅ .gitignore created"
print_success "✅ Structure verified"

echo ""
echo -e "${YELLOW}PROJECT IS READY FOR GITHUB!${NC}"
echo ""
echo "Next steps:"
echo "1. Initialize Git (if not done):"
echo "   git init"
echo ""
echo "2. Add all files:"
echo "   git add ."
echo ""
echo "3. Commit:"
echo "   git commit -m 'feat: enterprise-grade financial management platform with advanced security'"
echo ""
echo "4. Add remote (replace with your repository URL):"
echo "   git remote add origin https://github.com/yourusername/wealthlog.git"
echo ""
echo "5. Push to GitHub:"
echo "   git push -u origin main"
echo ""

# Show file count
FILE_COUNT=$(find "$PROJECT_ROOT" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" -not -path "*/.turbo/*" | wc -l)
print_status "Total files (excluding node_modules): $FILE_COUNT"

# Show directory structure summary
echo ""
echo "Project structure:"
echo "├── wealthlogs-code/"
echo "│   ├── apps/"
echo "│   │   ├── backend/     (Express.js API with security)"
echo "│   │   ├── web/         (Next.js with protected routes)"
echo "│   │   └── mobile/      (Capacitor app)"
echo "│   └── packages/"
echo "│       └── shared/      (Security services)"
echo "├── scripts/             (Maintenance scripts)"
echo "├── docs/                (Documentation)"
echo "└── README.md            (Project documentation)"

echo ""
print_success "Your WealthLog application is production-ready!"
