// src/index.js
require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); 
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;

// Use an environment variable ALLOWED_ORIGIN to differentiate 
// between development and production. Fallback to localhost:3000.
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

// 1) Parse cookies so we can read the JWT from req.cookies
app.use(cookieParser());

// 2) Configure CORS globally, allowing credentials (cookies) to be sent
app.use(cors({
  origin: allowedOrigin,
  credentials: true, 
}));

// 3) Parse incoming JSON bodies
app.use(express.json());

// 4) Routers
const authRouter = require('./routes/auth');
const tradeRouter = require('./routes/trade');
const transactionsRouter = require('./routes/transactions');
const accountRouter = require('./routes/account');
const financialAccountRouter = require('./routes/financialAccount');
const settingsRouter = require('./routes/settings');
const adminRouter = require('./routes/admin');
const communityRouter = require('./routes/community');
const coachingRouter = require('./routes/coaching');


// 5) Attach routers
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/transactions', transactionsRouter);
app.use('/trades', tradeRouter);
app.use('/account', accountRouter);
app.use('/financial-accounts', financialAccountRouter);
app.use('/settings', settingsRouter);
app.use('/community', communityRouter);
app.use('/coaching', coachingRouter);

// 6) Start the server
app.listen(PORT, () => {
  console.log(`WealthLog API running on port ${PORT}`);
});
