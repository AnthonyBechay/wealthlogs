// src/routes/transactions.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Use Bearer-based authentication middleware
const { authenticate } = require('../middleware/authenticate');

/**
 * GET /transactions
 * Returns all transactions for the user’s accounts in descending date.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    // 1) Find user accounts
    const userAccounts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId },
      select: { id: true }
    });
    const accountIds = userAccounts.map(a => a.id);

    // 2) Gather transactions in descending date
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromAccountId: { in: accountIds } },
          { toAccountId: { in: accountIds } }
        ]
      },
      orderBy: { dateTime: 'desc' }
    });

    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

/**
 * POST /transactions
 * Creates a new transaction.
 * Expected body: {
 *   type: "DEPOSIT" | "WITHDRAW" | "TRANSFER",
 *   amount: number,
 *   dateTime?: string,
 *   currency?: string,
 *   fromAccountId?: number,
 *   toAccountId?: number
 * }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, amount, dateTime, currency, fromAccountId, toAccountId } = req.body;

    if (!type) {
      return res.status(400).json({ error: "Transaction type is required" });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be > 0" });
    }

    // Parse date
    const dt = dateTime ? new Date(dateTime) : new Date();
    if (isNaN(dt.getTime())) {
      return res.status(400).json({ error: "Invalid dateTime format" });
    }

    // Check ownership for fromAccount and toAccount if provided
    if (fromAccountId) {
      const fromAcct = await prisma.financialAccount.findFirst({
        where: { id: fromAccountId, userId: req.user.userId }
      });
      if (!fromAcct) {
        return res.status(403).json({ error: "Not authorized to withdraw/transfer from that account" });
      }
    }
    if (toAccountId) {
      const toAcct = await prisma.financialAccount.findFirst({
        where: { id: toAccountId, userId: req.user.userId }
      });
      if (!toAcct) {
        return res.status(403).json({ error: "Not authorized to deposit/transfer to that account" });
      }
    }

    // Create the transaction
    const newTx = await prisma.transaction.create({
      data: {
        type,
        amount,
        dateTime: dt,
        currency: currency || "USD",
        fromAccountId: fromAccountId || null,
        toAccountId: toAccountId || null
      }
    });

    res.json({
      message: "Transaction created successfully",
      transactionId: newTx.id
    });
  } catch (error) {
    console.error("Failed to create transaction:", error);
    res.status(500).json({ error: "Failed to process transaction" });
  }
});

/**
 * POST /transactions/recalc
 * Recalculates final balances for each of the current user’s accounts
 * based on all their transactions, in chronological order.
 */
router.post('/recalc', authenticate, async (req, res) => {
  try {
    // 1) Find user accounts
    let userAccounts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId }
    });
    const accountIds = userAccounts.map(a => a.id);

    // 2) Reset each account balance to 0
    for (const acct of userAccounts) {
      await prisma.financialAccount.update({
        where: { id: acct.id },
        data: { balance: 0 }
      });
    }

    // 3) Fetch all relevant transactions in ascending order
    const allTx = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromAccountId: { in: accountIds } },
          { toAccountId: { in: accountIds } }
        ]
      },
      orderBy: { dateTime: 'asc' }
    });

    // 4) Update balances by iterating over transactions
    for (const tx of allTx) {
      if (tx.type === "DEPOSIT" && tx.toAccountId) {
        await prisma.financialAccount.update({
          where: { id: tx.toAccountId },
          data: { balance: { increment: tx.amount } }
        });
      } else if (tx.type === "WITHDRAW" && tx.fromAccountId) {
        await prisma.financialAccount.update({
          where: { id: tx.fromAccountId },
          data: { balance: { decrement: tx.amount } }
        });
      } else if (tx.type === "TRANSFER") {
        if (tx.fromAccountId) {
          await prisma.financialAccount.update({
            where: { id: tx.fromAccountId },
            data: { balance: { decrement: tx.amount } }
          });
        }
        if (tx.toAccountId) {
          await prisma.financialAccount.update({
            where: { id: tx.toAccountId },
            data: { balance: { increment: tx.amount } }
          });
        }
      }
    }

    // 5) Return updated accounts
    userAccounts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId }
    });

    res.json({
      message: "Recalculated all balances",
      accounts: userAccounts
    });
  } catch (error) {
    console.error("Failed to recalc accounts:", error);
    res.status(500).json({ error: "Failed to recalc accounts" });
  }
});

module.exports = router;
