// src/routes/account/transactions.routes.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../../lib/prisma');
const { authenticate } = require('../../middleware/auth.middleware');
const { recalcAccountBalance } = require('./recalc.helper'); // or your local helper



/* ------------------------------------------------------------------
 * POST /transactions  – Create a new cash movement
 * -----------------------------------------------------------------*/
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, amount, fromAccountId, toAccountId, dateTime, description } = req.body;
    if (!['DEPOSIT','WITHDRAW','TRANSFER','DIVIDEND'].includes(type))
      return res.status(400).json({ error: 'Invalid transaction type' });

    /* Ownership checks */
    const verify = async (id) => {
      if (!id) return;
      const acc = await prisma.financialAccount.findUnique({ where: { id } });
      if (!acc || acc.userId !== req.user.userId)
        throw new Error(`Not authorised for account ${id}`);
    };
    await Promise.all([verify(fromAccountId), verify(toAccountId)]);

    const txDate = dateTime ? new Date(dateTime) : new Date();

    const newTx = await prisma.transaction.create({
      data: {
        type,
        amount,
        fromAccountId: ['WITHDRAW','TRANSFER'].includes(type)  ? fromAccountId : null,
        toAccountId  : ['DEPOSIT','TRANSFER','DIVIDEND'].includes(type) ? toAccountId : null,
        dateTime     : txDate,
        description  : description ?? null
      }
    });

    /* Recalculate balances for impacted accounts */
    const recalc = [];
    if (fromAccountId) recalc.push(recalcAccountBalance(fromAccountId, { afterDate: txDate }));
    if (toAccountId)   recalc.push(recalcAccountBalance(toAccountId,   { afterDate: txDate }));
    await Promise.all(recalc);

    res.json({ message: 'Transaction created', transaction: newTx });
  } catch (err) {
    console.error('Transaction error:', err);
    const status = err.message?.includes('authorised') ? 403 : 500;
    res.status(status).json({ error: err.message ?? 'Failed to create transaction' });
  }
});

// GET all transactions for user's accounts
router.get('/', authenticate, async (req, res) => {
  try {
    // Get user's account IDs first
    const userAccounts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId },
      select: { id: true }
    });
    const accountIds = userAccounts.map(a => a.id);

    // Get all related transactions
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


module.exports = router;
