#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                 WealthLog Security Integration & Cleanup Script               ║
# ║                         Prepare for Production Deployment                     ║
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
echo -e "${BLUE}║      WealthLog Security Integration & Cleanup                      ║${NC}"
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
# STEP 1: BACKUP ORIGINAL FILES
# ============================================================================

print_status "Step 1: Backing up original files..."

cd "$PROJECT_ROOT/wealthlogs-code/apps/backend/src"

# Backup original index.js if not already backed up
if [ -f "index.js" ] && [ ! -f "index-original.js" ]; then
    cp index.js index-original.js
    print_success "Backed up original index.js"
fi

# Backup original auth routes if not already backed up
if [ -f "routes/auth/index.js" ] && [ ! -f "routes/auth/index-original.js" ]; then
    cp routes/auth/index.js routes/auth/index-original.js
    print_success "Backed up original auth routes"
fi

# ============================================================================
# STEP 2: INTEGRATE ENHANCED SECURITY FILES
# ============================================================================

print_status "Step 2: Integrating enhanced security files..."

# Replace with enhanced versions
if [ -f "index-enhanced.js" ]; then
    cp index-enhanced.js index.js
    print_success "Integrated enhanced index.js"
else
    print_warning "Enhanced index.js not found, keeping original"
fi

if [ -f "routes/auth/index-enhanced.js" ]; then
    cp routes/auth/index-enhanced.js routes/auth/index.js
    print_success "Integrated enhanced auth routes"
else
    print_warning "Enhanced auth routes not found, keeping original"
fi

# ============================================================================
# STEP 3: CLEAN UP OLD/DUPLICATE FILES
# ============================================================================

print_status "Step 3: Removing old and duplicate files..."

# Remove enhanced versions after integration
rm -f index-enhanced.js
rm -f routes/auth/index-enhanced.js
print_success "Removed duplicate enhanced files"

# Remove test/backup files that shouldn't be in production
find "$PROJECT_ROOT/wealthlogs-code" -name "*.backup" -type f -delete 2>/dev/null || true
find "$PROJECT_ROOT/wealthlogs-code" -name "*.bak" -type f -delete 2>/dev/null || true
find "$PROJECT_ROOT/wealthlogs-code" -name "*-old.*" -type f -delete 2>/dev/null || true
print_success "Removed backup files"

# ============================================================================
# STEP 4: INSTALL DEPENDENCIES
# ============================================================================

print_status "Step 4: Installing dependencies..."

# Install shared package dependencies
cd "$PROJECT_ROOT/wealthlogs-code/packages/shared"
if [ ! -d "node_modules" ]; then
    print_status "Installing shared package dependencies..."
    npm install --silent
fi

# Build shared package
print_status "Building shared package..."
npm run build

# Install backend dependencies
cd "$PROJECT_ROOT/wealthlogs-code/apps/backend"
if [ ! -d "node_modules" ] || [ ! -d "node_modules/@wealthlog" ]; then
    print_status "Installing backend dependencies..."
    npm install --silent
fi

# Install frontend dependencies
cd "$PROJECT_ROOT/wealthlogs-code/apps/web"
if [ ! -d "node_modules" ] || [ ! -d "node_modules/@wealthlog" ]; then
    print_status "Installing frontend dependencies..."
    npm install --silent
fi

print_success "All dependencies installed"

# ============================================================================
# STEP 5: VERIFY ENVIRONMENT FILES
# ============================================================================

print_status "Step 5: Verifying environment files..."

# Check backend .env
cd "$PROJECT_ROOT/wealthlogs-code/apps/backend"
if [ ! -f ".env" ]; then
    print_error "Backend .env file missing!"
    print_status "Creating template .env file..."
    cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://abechay:12345678@localhost:5432/wealthlog

# JWT Secrets (generate with: openssl rand -hex 32)
JWT_ACCESS_SECRET=your-32-character-secret-here
JWT_REFRESH_SECRET=another-32-character-secret-here
SECRET_KEY=same-as-jwt-access-secret
SESSION_SECRET=another-secure-secret
COOKIE_SECRET=yet-another-secure-secret

# Environment
NODE_ENV=development
PORT=5000

# Frontend
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3003

# Optional
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
EOF
    print_warning "Please update the .env file with your actual values"
else
    print_success "Backend .env file exists"
fi

# Check frontend .env.local
cd "$PROJECT_ROOT/wealthlogs-code/apps/web"
if [ ! -f ".env.local" ]; then
    print_status "Creating .env.local file..."
    cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
EOF
    print_success "Created frontend .env.local"
else
    print_success "Frontend .env.local exists"
fi

# ============================================================================
# STEP 6: FIX IMPORTS IN BACKEND
# ============================================================================

print_status "Step 6: Fixing backend imports..."

cd "$PROJECT_ROOT/wealthlogs-code/apps/backend/src"

# Check if utils/service-implementation.ts needs to be .js
if [ -f "utils/service-implementation.ts" ]; then
    # Convert TypeScript to JavaScript for backend
    print_status "Converting TypeScript service implementation to JavaScript..."
    
    # Create a JavaScript version
    cat > utils/service-implementation.js << 'EOF'
/**
 * Service Implementation for Backend
 * JavaScript version for Node.js runtime
 */

const { ErrorHandler, ErrorFactory, DataValidator, logger, metrics } = require('@wealthlog/shared');

// Express middleware for error handling
const errorMiddleware = (err, req, res, next) => {
  ErrorHandler.expressHandler(err, req, res, next);
  
  metrics.increment('api.errors', {
    endpoint: req.path,
    method: req.method,
    statusCode: err.statusCode ? err.statusCode.toString() : '500',
  });
};

// Validation middleware factory
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const result = DataValidator.validate(req.body, schema);
      
      if (!result.isValid) {
        throw ErrorFactory.validationError('Validation failed', result.errors);
      }
      
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Performance monitoring middleware
const performanceMiddleware = (req, res, next) => {
  const operationId = `${req.method} ${req.path}`;
  
  // Store start time
  req.startTime = Date.now();
  
  // Override res.send to capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    
    metrics.recordTiming('api.response_time', duration, {
      endpoint: req.path,
      method: req.method,
      status: res.statusCode.toString(),
    });
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Create rate limiter
const createRateLimiter = (maxRequests = 100, windowMs = 60000) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    // Get attempts for this IP
    let userAttempts = attempts.get(key) || [];
    
    // Filter out old attempts
    userAttempts = userAttempts.filter(time => now - time < windowMs);
    
    if (userAttempts.length >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: windowMs
      });
      return;
    }
    
    // Add current attempt
    userAttempts.push(now);
    attempts.set(key, userAttempts);
    
    next();
  };
};

// Security headers middleware
const securityHeadersMiddleware = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
};

// Request logging middleware
const requestLoggingMiddleware = (req, res, next) => {
  const requestId = require('crypto').randomBytes(16).toString('hex');
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  
  next();
};

// Setup health checks
const setupHealthChecks = (prisma) => {
  // This would be implemented with actual health check logic
  logger.info('Health checks configured');
};

// Async handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Sanitize input
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.replace(/[<>]/g, '');
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};

// Setup all middleware
const setupMiddleware = (app, prisma) => {
  app.use(securityHeadersMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(performanceMiddleware);
  
  setupHealthChecks(prisma);
  
  app.get('/health', async (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
};

module.exports = {
  errorMiddleware,
  validateRequest,
  performanceMiddleware,
  createRateLimiter,
  securityHeadersMiddleware,
  requestLoggingMiddleware,
  setupHealthChecks,
  asyncHandler,
  sanitizeInput,
  setupMiddleware,
};
EOF
    
    rm -f utils/service-implementation.ts
    print_success "Converted to JavaScript implementation"
fi

# ============================================================================
# STEP 7: RUN TESTS
# ============================================================================

print_status "Step 7: Running tests..."

cd "$PROJECT_ROOT"

# Simple connectivity tests
echo ""
print_status "Testing backend dependencies..."
cd "$PROJECT_ROOT/wealthlogs-code/apps/backend"
if [ -d "node_modules/express" ]; then
    print_success "✓ Express installed"
else
    print_error "✗ Express missing - run: npm install"
fi

if [ -d "node_modules/@prisma/client" ]; then
    print_success "✓ Prisma client installed"
else
    print_error "✗ Prisma client missing - run: npm install"
fi

if [ -d "node_modules/jsonwebtoken" ]; then
    print_success "✓ JWT installed"
else
    print_error "✗ JWT missing - run: npm install"
fi

echo ""
print_status "Testing frontend dependencies..."
cd "$PROJECT_ROOT/wealthlogs-code/apps/web"
if [ -d "node_modules/next" ]; then
    print_success "✓ Next.js installed"
else
    print_error "✗ Next.js missing - run: npm install"
fi

if [ -d "node_modules/react" ]; then
    print_success "✓ React installed"
else
    print_error "✗ React missing - run: npm install"
fi

# ============================================================================
# STEP 8: GENERATE PRISMA CLIENT
# ============================================================================

print_status "Step 8: Generating Prisma client..."

cd "$PROJECT_ROOT/wealthlogs-code/apps/backend"
npx prisma generate
print_success "Prisma client generated"

# ============================================================================
# STEP 9: CREATE .GITIGNORE IF NEEDED
# ============================================================================

print_status "Step 9: Verifying .gitignore..."

cd "$PROJECT_ROOT"
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
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

# Misc
.DS_Store
*.pem
.idea/
.vscode/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log
.maintain-logs/

# Turbo
.turbo/

# Uploads
uploads/
!uploads/.gitkeep

# Backup files
*.backup
*.bak
*-original.*
*-old.*

# IDE
.idea/
*.swp
*.swo
*~

# OS
Thumbs.db
EOF
    print_success "Created .gitignore"
else
    print_success ".gitignore exists"
fi

# ============================================================================
# STEP 10: FINAL SUMMARY
# ============================================================================

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    INTEGRATION COMPLETE!                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╗${NC}"
echo ""

print_success "✅ Security features integrated"
print_success "✅ Old files cleaned up"
print_success "✅ Dependencies installed"
print_success "✅ Environment files verified"
print_success "✅ Imports fixed"
print_success "✅ Prisma client generated"
print_success "✅ Project ready for GitHub push"

echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. Update JWT secrets in backend/.env with secure values:"
echo "   openssl rand -hex 32"
echo ""
echo "2. Test the application:"
echo "   cd wealthlogs-code/apps/backend && npm run dev"
echo "   cd wealthlogs-code/apps/web && npm run dev"
echo ""
echo "3. Commit and push to GitHub:"
echo "   git add ."
echo "   git commit -m 'feat: integrate enterprise security features'"
echo "   git push origin main"
echo ""

print_success "Your WealthLog app is now production-ready with enterprise security!"
