// apps/backend/src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/authenticate');

// GET /dashboard/networth?range=30d
router.get('/networth', authenticate, async (req, res) => {
  try {
    const rangeDays = parseInt(req.query.range?.replace('d', '')) || 30;
    const from = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

    // get all balanceHistory rows for this user within range
    const balances = await prisma.balanceHistory.findMany({
      where: {
        account: { userId: req.user.userId },
        date: { gte: from },
      },
      orderBy: { date: 'asc' },
    });

    // sum by day (ISO date string)
    const points = balances.reduce((acc, b) => {
      const ts = b.date.toISOString().split('T')[0];
      acc[ts] = (acc[ts] || 0) + b.balance;
      return acc;
    }, {});

    res.json(points);
  } catch (e) {
    console.error('Dashboard networth error:', e);
    res.status(500).json({ error: 'Failed to compute net worth' });
  }
});


router.get('/networth/summary', authenticate, async (req, res) => {
  try {
    const accounts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId, active: true },
      select: {
        balance: true,
        accountType: true,
        isLiquid: true,
      },
    });

    const fx       = accounts.filter(a => a.accountType === 'FX_COMMODITY')
                             .reduce((s, a) => s + a.balance, 0);
    const liquid   = accounts.filter(a => a.isLiquid)
                             .reduce((s, a) => s + a.balance, 0);
    const global   = accounts.reduce((s, a) => s + a.balance, 0);
    const illiquid = global - liquid;

    res.json({ fx, liquid, illiquid, global });
  } catch (e) {
    console.error('Net‑worth summary error:', e);
    res.status(500).json({ error: 'Failed to compute net‑worth summary' });
  }
});


module.exports = router;