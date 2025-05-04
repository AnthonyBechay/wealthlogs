// src/routes/account/transactions.routes.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../../lib/prisma');
const { authenticate } = require('../../middleware/authenticate');
const { recalcAccountBalance } = require('./recalc.helper'); // or your local helper

// GET all transactions for the user's accounts
router.get('/', authenticate, async (req, res) => {
  try {
    const userAccounts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    const accountIds = userAccounts.map(a => a.id);

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromAccountId: { in: accountIds } },
          { toAccountId: { in: accountIds } },
        ],
      },
      orderBy: { dateTime: 'desc' },
    });

    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// POST a new transaction with immediate partial recalc
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, amount, dateTime, currency, fromAccountId, toAccountId } = req.body;
    if (!type || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid type or amount" });
    }

    // Validate from/to ownership, etc.
    // (identical checks as your existing code)
    // ...

    // Create transaction
    const dt = dateTime ? new Date(dateTime) : new Date();
    const newTx = await prisma.transaction.create({
      data: {
        type,
        amount,
        dateTime: dt,
        currency: currency || "USD",
        fromAccountId: fromAccountId || null,
        toAccountId: toAccountId || null,
      }
    });

    // Now recalc only the fromAccount (if any) and toAccount (if any)
    if (fromAccountId) {
      await recalcAccountBalance(Number(fromAccountId));
    }
    if (toAccountId) {
      await recalcAccountBalance(Number(toAccountId));
    }

    res.json({ message: "Transaction created", transactionId: newTx.id });
  } catch (error) {
    console.error("Failed to create transaction:", error);
    res.status(500).json({ error: "Failed to process transaction" });
  }
});

module.exports = router;
