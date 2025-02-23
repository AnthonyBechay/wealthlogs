// src/index.js
require('dotenv').config(); // load env vars
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const app = express();
const PORT = process.env.PORT || 5000;

// Routers
const authRouter = require('./routes/auth');
const tradeRouter = require('./routes/trade');
const transactionsRouter = require('./routes/transactions');
const accountRouter = require('./routes/account');
const financialAccountRouter = require('./routes/financialAccount');
const settingsRouter = require('./routes/settings');
const adminRouter = require('./routes/admin');
// etc.

app.use(cors());
app.use(express.json());

// Attach routers
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/transactions', transactionsRouter);
app.use('/trades', tradeRouter);
app.use('/account', accountRouter);
app.use('/financial-accounts', financialAccountRouter);
app.use('/settings', settingsRouter);



// Start
app.listen(PORT, () => {
  console.log(`WealthLog API running on port ${PORT}`);
});



