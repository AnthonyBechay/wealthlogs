// src/routes/account/account.routes.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../../lib/prisma');
const { authenticate } = require('../../middleware/authenticate');

// GET all accounts for the authenticated user
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
  try {
    const { name, accountType, currency } = req.body;
    const newAccount = await prisma.financialAccount.create({
      data: {
        userId: req.user.userId,
        name,
        accountType,
        currency: currency || 'USD',
        balance: 0,
        isLiquid: true,
      },
    });
    res.json(newAccount);
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// UPDATE an existing account (e.g. rename, change currency, etc.)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, accountType, currency, isLiquid, active } = req.body;
    // Check ownership
    const account = await prisma.financialAccount.findUnique({ where: { id: Number(id) } });
    if (!account || account.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized or account not found" });
    }

    const updatedAccount = await prisma.financialAccount.update({
      where: { id: Number(id) },
      data: {
        name: name ?? account.name,
        accountType: accountType ?? account.accountType,
        currency: currency ?? account.currency,
        isLiquid: typeof isLiquid === 'boolean' ? isLiquid : account.isLiquid,
        active: typeof active === 'boolean' ? active : account.active,
      },
    });

    res.json(updatedAccount);
  } catch (error) {
    console.error("Error updating account:", error);
    res.status(500).json({ error: "Failed to update account" });
  }
});

// DELETE an account
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const account = await prisma.financialAccount.findUnique({ where: { id: Number(id) } });
    if (!account || account.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized or account not found" });
    }
    // Optionally check if balance is zero before deleting
    await prisma.financialAccount.delete({ where: { id: Number(id) } });
    res.json({ message: "Account deleted" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

module.exports = router;
