// src/index.js
// Load environment-specific config first, then base .env as fallback
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });
} else {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.development') });
}
// Load base .env for any missing values
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./middleware/passport.config');
const fs = require("fs");
const logger = require('./lib/logger');

const app = express();
const { prisma } = require('./lib/prisma');

const PORT = process.env.PORT || 5000;

// Parse allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3003'];

// ============= MIDDLEWARE =============

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page']
}));

// Compression
app.use(compression({
  level: 6,
  threshold: 2048,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    const contentType = res.getHeader('content-type') || '';
    
    // Skip already compressed formats
    if (contentType.includes('image/') || 
        contentType.includes('video/') || 
        contentType.includes('audio/') ||
        contentType.includes('application/zip') ||
        contentType.includes('application/gzip') ||
        contentType.includes('application/pdf')) {
      return false;
    }
    
    // Only compress text-based content
    return contentType.includes('text/') || 
           contentType.includes('application/json') || 
           contentType.includes('application/javascript') ||
           contentType.includes('application/xml');
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// ============= STATIC FILES =============

// Ensure upload folders exist
const uploadDirs = [
  "uploads/tradeImages",
  "uploads/realEstate",
  "uploads/documents", 
  "uploads/profileImages",
  "uploads/temp"
];

uploadDirs.forEach(dir => {
  const uploadDir = path.join(process.cwd(), dir);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
});

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// ============= HEALTH CHECK =============

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============= API ROUTES =============

// Import middleware
const { authenticate, requireRoles } = require('./middleware/auth.middleware');

// Auth routes (public)
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// Protected API routes
const adminRouter = require('./routes/admin');
const communityRouter = require('./routes/community');
const coachingRouter = require('./routes/coaching');
const accountRoutes = require('./routes/account/account.routes.js');
const transactionsRoutes = require('./routes/account/transactions.routes.js');
const tradeRouter = require("./routes/trade/trade.routes.js");
const tradeFilterRouter = require("./routes/trade/filter.routes.js");
const mt5syncRouter = require('./routes/trade/mt5sync.routes.js');
const dashboardRouter = require('./routes/landing/dashboard.js');
const generalSettingsRouter = require('./routes/settings/generalSettings.routes.js');
const tradingSettingsRouter = require('./routes/settings/tradingSettings.routes.js');
const tradingInsightsRouter = require('./routes/settings/tradingInsights.routes.js');

// Apply authentication middleware to all protected routes
app.use('/api/admin', authenticate, requireRoles('ADMIN'), adminRouter);
app.use('/api/community', authenticate, communityRouter);
app.use('/api/coaching', authenticate, coachingRouter);
app.use('/api/account', authenticate, accountRoutes);
app.use('/api/transactions', authenticate, transactionsRoutes);
app.use('/api/trade', authenticate, tradeRouter);
app.use('/api/tradeFilter', authenticate, tradeFilterRouter);
app.use('/api/mt5sync', authenticate, mt5syncRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);
app.use('/api/generalSettings', authenticate, generalSettingsRouter);
app.use('/api/tradingSettings', authenticate, tradingSettingsRouter);
app.use('/api/trade/insights', authenticate, tradingInsightsRouter);

// ============= ERROR HANDLING =============

// 404 handler
app.use((req, res, next) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Internal server error:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    body: req.body,
    query: req.query
  });
  
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: err.stack })
  });
});

// ============= START SERVER =============

app.listen(PORT, () => {
  logger.info(`🚀 WealthLog API running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔐 Auth: JWT with refresh tokens enabled`);
  logger.info(`🌐 CORS: ${allowedOrigins.join(', ')}`);
  logger.info(`⚡ Compression: Smart filtering enabled`);
  logger.info(`🛡️  Security: Helmet & Rate limiting active`);
  logger.info(`📊 Health check: /health`);
  logger.info(`🔑 OAuth: Google authentication ${process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});
