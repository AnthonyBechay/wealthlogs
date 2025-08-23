#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                    Project Structure Organization Script                      ║
# ║                    Creates optimal folder structure for WealthLog             ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🏗️  Setting up optimal project structure for WealthLog..."

# ================================================================================
# BACKEND STRUCTURE
# ================================================================================
echo "📦 Organizing backend structure..."

BACKEND_DIR="$PROJECT_ROOT/wealthlogs-code/apps/backend"

# Create backend directories
mkdir -p "$BACKEND_DIR/src/routes/api/v1"
mkdir -p "$BACKEND_DIR/src/middleware/auth"
mkdir -p "$BACKEND_DIR/src/middleware/validation"
mkdir -p "$BACKEND_DIR/src/middleware/error"
mkdir -p "$BACKEND_DIR/src/services/auth"
mkdir -p "$BACKEND_DIR/src/services/user"
mkdir -p "$BACKEND_DIR/src/services/account"
mkdir -p "$BACKEND_DIR/src/services/transaction"
mkdir -p "$BACKEND_DIR/src/services/dashboard"
mkdir -p "$BACKEND_DIR/src/services/email"
mkdir -p "$BACKEND_DIR/src/services/cache"
mkdir -p "$BACKEND_DIR/src/utils/crypto"
mkdir -p "$BACKEND_DIR/src/utils/validators"
mkdir -p "$BACKEND_DIR/src/utils/helpers"
mkdir -p "$BACKEND_DIR/src/utils/constants"
mkdir -p "$BACKEND_DIR/src/config"
mkdir -p "$BACKEND_DIR/src/types"
mkdir -p "$BACKEND_DIR/src/interfaces"
mkdir -p "$BACKEND_DIR/src/models"
mkdir -p "$BACKEND_DIR/tests/unit"
mkdir -p "$BACKEND_DIR/tests/integration"
mkdir -p "$BACKEND_DIR/tests/fixtures"
mkdir -p "$BACKEND_DIR/tests/mocks"
mkdir -p "$BACKEND_DIR/docs/api"
mkdir -p "$BACKEND_DIR/scripts"

# ================================================================================
# FRONTEND STRUCTURE
# ================================================================================
echo "🌐 Organizing frontend structure..."

FRONTEND_DIR="$PROJECT_ROOT/wealthlogs-code/apps/web"

# Create frontend directories
mkdir -p "$FRONTEND_DIR/src/components/common"
mkdir -p "$FRONTEND_DIR/src/components/layout"
mkdir -p "$FRONTEND_DIR/src/components/dashboard"
mkdir -p "$FRONTEND_DIR/src/components/accounts"
mkdir -p "$FRONTEND_DIR/src/components/transactions"
mkdir -p "$FRONTEND_DIR/src/components/auth"
mkdir -p "$FRONTEND_DIR/src/components/charts"
mkdir -p "$FRONTEND_DIR/src/components/forms"
mkdir -p "$FRONTEND_DIR/src/components/modals"
mkdir -p "$FRONTEND_DIR/src/hooks/api"
mkdir -p "$FRONTEND_DIR/src/hooks/auth"
mkdir -p "$FRONTEND_DIR/src/hooks/ui"
mkdir -p "$FRONTEND_DIR/src/contexts"
mkdir -p "$FRONTEND_DIR/src/services/api"
mkdir -p "$FRONTEND_DIR/src/services/auth"
mkdir -p "$FRONTEND_DIR/src/services/storage"
mkdir -p "$FRONTEND_DIR/src/utils/formatters"
mkdir -p "$FRONTEND_DIR/src/utils/validators"
mkdir -p "$FRONTEND_DIR/src/utils/helpers"
mkdir -p "$FRONTEND_DIR/src/utils/constants"
mkdir -p "$FRONTEND_DIR/src/types"
mkdir -p "$FRONTEND_DIR/src/interfaces"
mkdir -p "$FRONTEND_DIR/src/styles/components"
mkdir -p "$FRONTEND_DIR/src/styles/layouts"
mkdir -p "$FRONTEND_DIR/src/styles/themes"
mkdir -p "$FRONTEND_DIR/public/images"
mkdir -p "$FRONTEND_DIR/public/icons"
mkdir -p "$FRONTEND_DIR/public/fonts"
mkdir -p "$FRONTEND_DIR/tests/unit"
mkdir -p "$FRONTEND_DIR/tests/integration"
mkdir -p "$FRONTEND_DIR/tests/e2e"

# ================================================================================
# SHARED PACKAGE STRUCTURE
# ================================================================================
echo "📚 Organizing shared package structure..."

SHARED_DIR="$PROJECT_ROOT/wealthlogs-code/packages/shared"

# Create shared directories
mkdir -p "$SHARED_DIR/src/types"
mkdir -p "$SHARED_DIR/src/interfaces"
mkdir -p "$SHARED_DIR/src/constants"
mkdir -p "$SHARED_DIR/src/utils"
mkdir -p "$SHARED_DIR/src/validators"
mkdir -p "$SHARED_DIR/src/enums"
mkdir -p "$SHARED_DIR/tests"

# ================================================================================
# MOBILE APP STRUCTURE
# ================================================================================
echo "📱 Organizing mobile app structure..."

MOBILE_DIR="$PROJECT_ROOT/wealthlogs-code/apps/mobile"

# Create mobile directories
mkdir -p "$MOBILE_DIR/src/components"
mkdir -p "$MOBILE_DIR/src/pages"
mkdir -p "$MOBILE_DIR/src/services"
mkdir -p "$MOBILE_DIR/src/utils"
mkdir -p "$MOBILE_DIR/src/hooks"
mkdir -p "$MOBILE_DIR/src/styles"
mkdir -p "$MOBILE_DIR/resources"

# ================================================================================
# DOCUMENTATION STRUCTURE
# ================================================================================
echo "📖 Organizing documentation structure..."

DOCS_DIR="$PROJECT_ROOT/docs"

# Create documentation directories
mkdir -p "$DOCS_DIR/api"
mkdir -p "$DOCS_DIR/architecture"
mkdir -p "$DOCS_DIR/deployment"
mkdir -p "$DOCS_DIR/development"
mkdir -p "$DOCS_DIR/security"
mkdir -p "$DOCS_DIR/testing"
mkdir -p "$DOCS_DIR/mobile"
mkdir -p "$DOCS_DIR/database"

# ================================================================================
# CI/CD STRUCTURE
# ================================================================================
echo "🔄 Setting up CI/CD structure..."

mkdir -p "$PROJECT_ROOT/.github/workflows"
mkdir -p "$PROJECT_ROOT/.github/actions"
mkdir -p "$PROJECT_ROOT/.github/ISSUE_TEMPLATE"
mkdir -p "$PROJECT_ROOT/.github/PULL_REQUEST_TEMPLATE"

# ================================================================================
# TESTING STRUCTURE
# ================================================================================
echo "🧪 Setting up testing structure..."

mkdir -p "$PROJECT_ROOT/tests/e2e"
mkdir -p "$PROJECT_ROOT/tests/performance"
mkdir -p "$PROJECT_ROOT/tests/security"
mkdir -p "$PROJECT_ROOT/tests/load"

# ================================================================================
# DEPLOYMENT CONFIGS
# ================================================================================
echo "🚀 Setting up deployment configs..."

mkdir -p "$PROJECT_ROOT/deployment/docker"
mkdir -p "$PROJECT_ROOT/deployment/kubernetes"
mkdir -p "$PROJECT_ROOT/deployment/terraform"
mkdir -p "$PROJECT_ROOT/deployment/nginx"

# ================================================================================
# CREATE PLACEHOLDER FILES
# ================================================================================
echo "📝 Creating placeholder files..."

# Backend placeholders
touch "$BACKEND_DIR/src/config/database.ts"
touch "$BACKEND_DIR/src/config/redis.ts"
touch "$BACKEND_DIR/src/config/logger.ts"
touch "$BACKEND_DIR/src/middleware/auth/authenticate.ts"
touch "$BACKEND_DIR/src/middleware/validation/validator.ts"
touch "$BACKEND_DIR/src/middleware/error/errorHandler.ts"

# Frontend placeholders
touch "$FRONTEND_DIR/src/utils/constants/api.ts"
touch "$FRONTEND_DIR/src/utils/constants/routes.ts"
touch "$FRONTEND_DIR/src/services/api/client.ts"
touch "$FRONTEND_DIR/src/services/auth/authService.ts"

# Shared placeholders
touch "$SHARED_DIR/src/types/index.ts"
touch "$SHARED_DIR/src/interfaces/index.ts"
touch "$SHARED_DIR/src/constants/index.ts"

# Documentation placeholders
touch "$DOCS_DIR/README.md"
touch "$DOCS_DIR/api/README.md"
touch "$DOCS_DIR/architecture/README.md"
touch "$DOCS_DIR/deployment/README.md"

echo ""
echo "✅ Project structure organized successfully!"
echo ""
echo "📁 Created directories:"
echo "  - Backend: Enhanced service-oriented architecture"
echo "  - Frontend: Component-based structure with clear separation"
echo "  - Shared: Common types and utilities"
echo "  - Mobile: Capacitor app structure"
echo "  - Documentation: Comprehensive docs organization"
echo "  - Testing: Multi-level testing structure"
echo "  - CI/CD: GitHub Actions ready"
echo "  - Deployment: Multi-platform deployment configs"
echo ""
echo "💡 Next steps:"
echo "  1. Run: ./scripts/maintain.sh init"
echo "  2. Configure: ./scripts/maintain.sh config edit"
echo "  3. Start developing: ./scripts/maintain.sh dev"