// src/index.js
require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const fs = require("fs");
const path = require("path");

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

// Parse allowed origins from environment variable if needed
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

// Basic cors
app.use(cors({ origin: '*' }));

// Security middleware
app.use(helmet());

// Rate limiting: limit each IP to 1000 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});
app.use(limiter);

// Parse incoming JSON bodies
app.use(express.json());

// Ensure "uploads/tradeImages" folder exists
const uploadDir = path.join(process.cwd(), "uploads", "tradeImages");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// Serve static files from /uploads so we can access images at /uploads/tradeImages/...
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Import your routers
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const communityRouter = require('./routes/community');
const coachingRouter = require('./routes/coaching');
const accountRoutes = require('./routes/account/account.routes.js');
const transactionsRoutes = require('./routes/account/transactions.routes.js');
const settingsRouter = require('./routes/settings/settings.routes.js');
const tradeRouter = require("./routes/trade/trade.routes.js");

// Attach routers
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use("/trade", tradeRouter);
app.use('/community', communityRouter);
app.use('/coaching', coachingRouter);
app.use('/account', accountRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/settings', settingsRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`WealthLog API running on port ${PORT}`);
});

// 404 if no route matched
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

// Optional generic error handler
app.use((err, req, res, next) => {
  console.error('Internal server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
