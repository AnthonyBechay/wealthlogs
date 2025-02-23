// src/routes/transactions.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/authenticate');

/**
 * GET /transactions
 * Returns all transactions for the user's accounts in descending date.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    // find user accounts
    const userAccounts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId },
      select: { id: true }
    });
    const accountIds = userAccounts.map(a => a.id);

    // gather transactions
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
 * Body: {
 *   type: "DEPOSIT"|"WITHDRAW"|"TRANSFER",
 *   amount: number,
 *   dateTime?: string,
 *   currency?: string,
 *   fromAccountId?: number,
 *   toAccountId?: number
 * }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      type,
      amount,
      dateTime,
      currency,
      fromAccountId,
      toAccountId
    } = req.body;

    // Validate
    if (!type) {
      return res.status(400).json({ error: "Transaction type is required" });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be > 0" });
    }

    // parse date
    const dt = dateTime ? new Date(dateTime) : new Date();
    if (isNaN(dt.getTime())) {
      return res.status(400).json({ error: "Invalid dateTime format" });
    }

    // Check user ownership of accounts if provided
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

    // create
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
 * Re-walks all transactions (only for the current user's accounts)
 * in chronological order, computing final balances for each account.
 */
router.post('/recalc', authenticate, async (req, res) => {
  try {
    // 1) find user accounts
    let userAccounts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId }
    });
    const accountIds = userAccounts.map(a => a.id);

    // 2) set all user accounts to 0
    for (const acct of userAccounts) {
      await prisma.financialAccount.update({
        where: { id: acct.id },
        data: { balance: 0 }
      });
    }

    // 3) fetch all relevant transactions in ascending date
    const allTx = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromAccountId: { in: accountIds } },
          { toAccountId: { in: accountIds } }
        ]
      },
      orderBy: { dateTime: 'asc' }
    });

    // 4) walk them in chronological order, updating account balances
    for (const tx of allTx) {
      if (tx.type === "DEPOSIT") {
        if (tx.toAccountId) {
          await prisma.financialAccount.update({
            where: { id: tx.toAccountId },
            data: {
              balance: { increment: tx.amount }
            }
          });
        }
      } else if (tx.type === "WITHDRAW") {
        if (tx.fromAccountId) {
          await prisma.financialAccount.update({
            where: { id: tx.fromAccountId },
            data: {
              balance: { decrement: tx.amount }
            }
          });
        }
      } else if (tx.type === "TRANSFER") {
        if (tx.fromAccountId) {
          await prisma.financialAccount.update({
            where: { id: tx.fromAccountId },
            data: {
              balance: { decrement: tx.amount }
            }
          });
        }
        if (tx.toAccountId) {
          await prisma.financialAccount.update({
            where: { id: tx.toAccountId },
            data: {
              balance: { increment: tx.amount }
            }
          });
        }
      }
    }

    // 5) done. fetch the updated accounts to return them
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
