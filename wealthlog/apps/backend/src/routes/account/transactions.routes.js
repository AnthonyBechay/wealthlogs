// src/routes/account/transactions.routes.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../../lib/prisma');
const { authenticate } = require('../../middleware/authenticate');
const { recalcAccountBalance } = require('./recalc.helper'); // or your local helper


// GET all transactions for authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    // Get user's accounts first
    const userAccounts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId },
      select: { id: true }
    });
    const accountIds = userAccounts.map(a => a.id);

    // Get all transactions involving these accounts
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromAccountId: { in: accountIds } },
          { toAccountId: { in: accountIds } }
        ]
      },
      orderBy: { dateTime: 'desc' },
      include: {
        fromAccount: { select: { name: true } },
        toAccount: { select: { name: true } }
      }
    });

    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});


router.post('/', authenticate, async (req, res) => {
  try {
    const { type, amount, fromAccountId, toAccountId, dateTime } = req.body;

    // Validate transaction type
    if (!['DEPOSIT', 'WITHDRAW', 'TRANSFER', 'DIVIDEND'].includes(type)) {
      return res.status(400).json({ error: "Invalid transaction type" });
    }

    // Verify account ownership
    const verifyAccount = async (accountId) => {
      if (!accountId) return null;
      const account = await prisma.financialAccount.findUnique({
        where: { id: accountId }
      });
      if (!account || account.userId !== req.user.userId) {
        throw new Error(`Not authorized for account ${accountId}`);
      }
      return account;
    };

    const [fromAccount, toAccount] = await Promise.all([
      verifyAccount(fromAccountId),
      verifyAccount(toAccountId)
    ]);

    // Create transaction
    const newTx = await prisma.transaction.create({
      data: {
        type,
        amount,
        fromAccountId: ['WITHDRAW', 'TRANSFER'].includes(type) ? fromAccountId : null,
        toAccountId: ['DEPOSIT', 'TRANSFER', 'DIVIDEND'].includes(type) ? toAccountId : null,
        dateTime: dateTime ? new Date(dateTime) : new Date()
      }
    });

    // Recalculate affected accounts
    const recalcAccounts = [];
    if (fromAccountId) recalcAccounts.push(recalcAccountBalance(fromAccountId));
    if (toAccountId) recalcAccounts.push(recalcAccountBalance(toAccountId));
    await Promise.all(recalcAccounts);

    res.json({ 
      message: "Transaction created", 
      transactionId: newTx.id 
    });

  } catch (error) {
    console.error("Transaction error:", error);
    res.status(403).json({ error: error.message });
  }
});

module.exports = router;
