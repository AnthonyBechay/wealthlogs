// src/index.js
require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fs = require("fs");
const path = require("path");
const logger = require('./lib/logger'); // Import Winston logger

const app = express();
const { prisma } = require('./lib/prisma');

const PORT = process.env.PORT || 5000;

// ✅ CORRECT CORS CONFIGURATION
// These are the URLs that are allowed to make requests to your API.
const allowedOrigins = [
  // IMPORTANT: Replace with your Vercel deployment URL
  process.env.FRONTEND_URL || 'https://your-app-name.vercel.app', 
  // For local development
  'http://localhost:3000' 
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman, mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));


// Security middleware
app.use(helmet());

// Smart compression
app.use(compression({
  level: 6,
  threshold: 2048,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) { return false; }
    const contentType = res.getHeader('content-type') || '';
    const isCompressed = /image|video|audio|zip|gzip|rar|pdf/.test(contentType);
    if (isCompressed) { return false; }
    return /json|text|javascript|xml|css/.test(contentType);
  }
}));


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// JSON parsing with size limits
app.use(express.json({ limit: '10mb' }));

// Ensure upload folders exist
const uploadDirs = ["uploads/tradeImages", "uploads/realEstate", "uploads/documents", "uploads/profileImages", "uploads/temp"];
uploadDirs.forEach(dir => {
  const uploadDir = path.join(process.cwd(), dir);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
});

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: '1d' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: Math.floor(process.uptime()) });
});

// Import and use your API routers
const authRouter = require('./routes/auth');
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
const tradingInsightsRouter = require('./routes/settings/tradingSettings.routes.js');

app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use("/trade", tradeRouter);
app.use("/tradeFilter", tradeFilterRouter);
app.use('/community', communityRouter);
app.use('/coaching', coachingRouter);
app.use('/account', accountRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/mt5sync', mt5syncRouter);
app.use('/dashboard', dashboardRouter);
app.use('/generalSettings', generalSettingsRouter);
app.use('/tradingSettings', tradingSettingsRouter);
app.use("/trade/insights", tradingInsightsRouter);

// 404 Handler for API routes
app.use((req, res, next) => {
  res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Internal server error:', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`🚀 WealthLog API running on port ${PORT}`);
  logger.info(`✅ CORS enabled for: ${allowedOrigins.join(', ')}`);
});