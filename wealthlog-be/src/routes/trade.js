// src/routes/trade.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { authenticate } = require('../middleware/authenticate');
const { getOrCreateCashAccountForUser, recalcAccountBalance } = require('../helpers/recalc');

/** Helper: detectSession */
function detectSession(dateString) {
  const d = dateString ? new Date(dateString) : new Date();
  const hour = d.getHours();

  if (hour >= 10 && hour <= 12) return "London";
  if (hour >= 16 && hour <= 19) return "US";
  return "Other";
}

/**
 * ADD a new FX trade.
 * We'll require these in body:
 *   instrument: string
 *   amount?: number
 *   fees?: number
 *   dateTime?: string
 *   pattern?: string
 *   direction?: "Long"|"Short"
 *   accountId?: number
 *   // plus optional FX details:
 *   entryPrice?: number
 *   exitPrice?: number
 *   lots?: number
 *   pipsGain?: number
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

    // fx specifics
    entryPrice,
    exitPrice,
    lots,
    pipsGain
  } = req.body;

  if (!instrument) {
    return res.status(400).json({ error: "Instrument is required" });
  }

  try {
    // 1) Confirm the account or fallback to a user "cash" account
    let acctId = accountId;
    if (!acctId) {
      // If you want to force them to pick an actual account, remove this fallback
      const cashAcct = await getOrCreateCashAccountForUser(req.user.userId);
      acctId = cashAcct.id;
    }

    // 2) Convert dateTime
    const tradeTime = dateTime ? new Date(dateTime) : new Date();
    if (isNaN(tradeTime.getTime())) {
      return res.status(400).json({ error: "Invalid dateTime" });
    }

    const session = detectSession(tradeTime);

    // 3) Create the main Trade, setting tradeType = "FX"
    const newTrade = await prisma.trade.create({
      data: {
        instrument,
        accountId: acctId,
        tradeType: "FX",               // <---- always "FX"
        fees,
        entryDate: tradeTime,
        pattern,
        notes: `session: ${session}`,
        amount,
        tradeDirection: direction === "Long" ? "LONG" : "SHORT",
      }
    });

    // 4) Create the corresponding FxTrade record
    await prisma.fxTrade.create({
      data: {
        tradeId: newTrade.id,
        entryPrice: entryPrice || 0,
        exitPrice: exitPrice || 0,
        lots: lots || 0,
        pipsGain: pipsGain || 0
      }
    });

    // 5) Recalc account if you want
    await recalcAccountBalance(acctId);

    res.json({ message: "FX trade added successfully" });
  } catch (error) {
    console.error("Error adding FX trade:", error);
    res.status(500).json({ error: "Failed to add FX trade" });
  }
});

/**
 * GET trades
 * If ?accountId=, we return trades for that account only.
 * Otherwise, we gather all the user's accounts, then all trades.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const accountId = parseInt(req.query.accountId);
    if (accountId) {
      // Validate ownership
      const account = await prisma.financialAccount.findUnique({ where: { id: accountId } });
      if (!account || account.userId !== req.user.userId) {
        return res.status(403).json({ error: "Not authorized for that account" });
      }
      const trades = await prisma.trade.findMany({
        where: { accountId },
        orderBy: { entryDate: 'desc' },
        include: { fxTrade: true } // include FX details
      });
      return res.json(trades);
    }

    // Otherwise fetch trades for all user accounts
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
 * EDIT an FX trade
 * Body can have all the fields: instrument, amount, fees, dateTime,
 * pattern, direction, plus optional fxTrade details (entryPrice, exitPrice, etc.).
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const tradeId = parseInt(req.params.id);
    const existingTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { fxTrade: true } // so we can update it
    });
    if (!existingTrade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Validate user ownership
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

      // fx details
      entryPrice,
      exitPrice,
      lots,
      pipsGain
    } = req.body;

    if (!instrument) {
      return res.status(400).json({ error: "Instrument is required" });
    }

    // Convert dateTime
    const tradeTime = dateTime ? new Date(dateTime) : new Date();
    if (isNaN(tradeTime.getTime())) {
      return res.status(400).json({ error: "Invalid dateTime" });
    }
    const session = detectSession(tradeTime);

    // 1) Update the main trade
    const updatedTrade = await prisma.trade.update({
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

    // 2) If it's an FX trade (existingTrade.tradeType === 'FX'), update fxTrade
    if (existingTrade.tradeType === 'FX') {
      // if there's an existing fxTrade row
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
        // if for some reason it didn't exist, create it
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

    // 3) Recalc
    await recalcAccountBalance(account.id);

    res.json({ message: "FX trade updated" });
  } catch (error) {
    console.error("Error updating trade:", error);
    res.status(500).json({ error: "Failed to update trade" });
  }
});

/**
 * DELETE a trade
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

    // 1) Optional: if it's an FX trade, remove the fxTrade row first
    if (trade.tradeType === 'FX') {
      await prisma.fxTrade.deleteMany({
        where: { tradeId: tradeId }
      });
    }

    // 2) Delete the trade
    await prisma.trade.delete({ where: { id: tradeId } });

    // 3) Recalc
    await recalcAccountBalance(account.id);

    res.json({ message: "Trade deleted successfully" });
  } catch (error) {
    console.error("Error deleting trade:", error);
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

module.exports = router;
