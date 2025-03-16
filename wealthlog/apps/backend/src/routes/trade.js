// src/routes/trade.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import the Bearer-based authentication middleware
const { authenticate } = require('../middleware/authenticate');

// Helpers for account creation and balance recalculation
const { getOrCreateCashAccountForUser, recalcAccountBalance } = require('../routes/account/recalc.helper.js');

/** Helper: detectSession
 * Determines a trading session label based on the given date/time.
 */
function detectSession(dateString) {
  const d = dateString ? new Date(dateString) : new Date();
  const hour = d.getHours();

  if (hour >= 10 && hour <= 12) return "London";
  if (hour >= 16 && hour <= 19) return "US";
  return "Other";
}

/**
 * POST /trades
 * Adds a new FX trade.
 */
router.post('/', authenticate, async (req, res) => {
  const {
    instrument,
    amount = 0,
    fees = 0,
    dateTime,
    pattern = "",
    direction = "Long",
    accountId,
    // FX specifics
    entryPrice,
    exitPrice,
    lots,
    pipsGain
  } = req.body;

  if (!instrument) {
    return res.status(400).json({ error: "Instrument is required" });
  }

  try {
    // Use provided accountId or create/get the user's default CASH account.
    let acctId = accountId;
    if (!acctId) {
      const cashAcct = await getOrCreateCashAccountForUser(req.user.userId);
      acctId = cashAcct.id;
    }

    const tradeTime = dateTime ? new Date(dateTime) : new Date();
    if (isNaN(tradeTime.getTime())) {
      return res.status(400).json({ error: "Invalid dateTime" });
    }

    const session = detectSession(tradeTime);

    const newTrade = await prisma.trade.create({
      data: {
        instrument,
        accountId: acctId,
        tradeType: "FX",
        fees,
        entryDate: tradeTime,
        pattern,
        notes: `session: ${session}`,
        amount,
        tradeDirection: direction === "Long" ? "LONG" : "SHORT",
      }
    });

    await prisma.fxTrade.create({
      data: {
        tradeId: newTrade.id,
        entryPrice: entryPrice || 0,
        exitPrice: exitPrice || 0,
        lots: lots || 0,
        pipsGain: pipsGain || 0
      }
    });

    // Recalculate the account balance after trade entry
    await recalcAccountBalance(acctId);

    res.json({ message: "FX trade added successfully" });
  } catch (error) {
    console.error("Error adding FX trade:", error);
    res.status(500).json({ error: "Failed to add FX trade" });
  }
});

/**
 * GET /trades
 * Retrieves trades for a specific account (if provided) or for all user accounts.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const accountId = parseInt(req.query.accountId);
    if (accountId) {
      // Validate that the account belongs to the user
      const account = await prisma.financialAccount.findUnique({
        where: { id: accountId }
      });
      if (!account || account.userId !== req.user.userId) {
        return res.status(403).json({ error: "Not authorized for that account" });
      }
      const trades = await prisma.trade.findMany({
        where: { accountId },
        orderBy: { entryDate: 'desc' },
        include: { fxTrade: true } 
      });
      return res.json(trades);
    }

    // Otherwise, fetch trades for all of the user's accounts
    const userAccounts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    const accountIds = userAccounts.map(a => a.id);

    const trades = await prisma.trade.findMany({
      where: { accountId: { in: accountIds } },
      orderBy: { entryDate: 'desc' },
      include: { fxTrade: true }
    });
    res.json(trades);
  } catch (error) {
    console.error("Error fetching trades:", error);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

/**
 * PUT /trades/:id
 * Edits an existing FX trade.
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const tradeId = parseInt(req.params.id);
    const existingTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { fxTrade: true }
    });
    if (!existingTrade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Validate user ownership of the account related to this trade
    const account = await prisma.financialAccount.findUnique({
      where: { id: existingTrade.accountId }
    });
    if (!account || account.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized to edit this trade" });
    }

    const {
      instrument,
      amount = 0,
      fees = 0,
      dateTime,
      pattern = "",
      direction = "Long",
      // FX details
      entryPrice,
      exitPrice,
      lots,
      pipsGain
    } = req.body;

    if (!instrument) {
      return res.status(400).json({ error: "Instrument is required" });
    }

    const tradeTime = dateTime ? new Date(dateTime) : new Date();
    if (isNaN(tradeTime.getTime())) {
      return res.status(400).json({ error: "Invalid dateTime" });
    }
    const session = detectSession(tradeTime);

    await prisma.trade.update({
      where: { id: tradeId },
      data: {
        instrument,
        fees,
        entryDate: tradeTime,
        pattern,
        notes: `session: ${session}`,
        amount,
        tradeDirection: direction === "Long" ? "LONG" : "SHORT"
      }
    });

    if (existingTrade.tradeType === 'FX') {
      if (existingTrade.fxTrade) {
        await prisma.fxTrade.update({
          where: { tradeId: tradeId },
          data: {
            entryPrice: entryPrice ?? existingTrade.fxTrade.entryPrice,
            exitPrice: exitPrice ?? existingTrade.fxTrade.exitPrice,
            lots: lots ?? existingTrade.fxTrade.lots,
            pipsGain: pipsGain ?? existingTrade.fxTrade.pipsGain
          }
        });
      } else {
        await prisma.fxTrade.create({
          data: {
            tradeId: tradeId,
            entryPrice: entryPrice || 0,
            exitPrice: exitPrice || 0,
            lots: lots || 0,
            pipsGain: pipsGain || 0
          }
        });
      }
    }

    // Recalculate the account balance after trade update
    await recalcAccountBalance(account.id);
    res.json({ message: "FX trade updated" });
  } catch (error) {
    console.error("Error updating trade:", error);
    res.status(500).json({ error: "Failed to update trade" });
  }
});

/**
 * DELETE /trades/:id
 * Deletes an existing trade.
 */
router.delete('/:id', authenticate, async (req, res) => {
  const tradeId = parseInt(req.params.id);
  try {
    const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }
    const account = await prisma.financialAccount.findUnique({
      where: { id: trade.accountId }
    });
    if (!account || account.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized to delete this trade" });
    }

    if (trade.tradeType === 'FX') {
      await prisma.fxTrade.deleteMany({
        where: { tradeId: tradeId }
      });
    }

    await prisma.trade.delete({ where: { id: tradeId } });
    await recalcAccountBalance(account.id);

    res.json({ message: "Trade deleted successfully" });
  } catch (error) {
    console.error("Error deleting trade:", error);
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

module.exports = router;
