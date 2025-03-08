// src/routes/financialAccount.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Cookie-based auth middleware
const { authenticate } = require('../middleware/authenticate');

// GET all accounts for this user
router.get('/', authenticate, async (req, res) => {
  try {
    const accounts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(accounts);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// CREATE a new account
router.post('/', authenticate, async (req, res) => {
  const { name, accountType } = req.body;
  try {
    const newAccount = await prisma.financialAccount.create({
      data: {
        userId: req.user.userId,
        name,
        accountType,
        balance: 0,
        currency: "USD",
        isLiquid: true,
      },
    });
    res.json(newAccount);
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

module.exports = router;
