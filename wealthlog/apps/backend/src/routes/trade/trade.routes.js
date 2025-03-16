// src/routes/trade/trade.routes.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { authenticate } = require("../../middleware/authenticate");
const { recalcAccountBalance } = require("../account/recalc.helper");

// optional helper if you want to store session notes
function detectSession(dateString) {
  const d = dateString ? new Date(dateString) : new Date();
  const hour = d.getHours();
  if (hour >= 10 && hour <= 12) return "London";
  if (hour >= 16 && hour <= 19) return "US";
  return "Other";
}

/**
 * POST /trade
 * Expects e.g. {
 *   tradeType: "FX",
 *   accountId: number,
 *   instrument: string,
 *   direction: "Long"|"Short",
 *   fees?: number,
 *   dateTime?: string,
 *   pattern?: string,
 *   fx?: { amountGain?: number, percentageGain?: number },
 *   bond?: { ... },
 *   stock?: { ... },
 * }
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      tradeType,
      accountId,
      instrument,
      direction = "Long",
      fees = 0,
      dateTime,
      pattern,
      fx = {},
      bond = {},
      stock = {},
    } = req.body;

    if (!tradeType) {
      return res.status(400).json({ error: "tradeType is required" });
    }
    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }
    if (!instrument) {
      return res.status(400).json({ error: "instrument is required" });
    }

    // confirm account belongs to user
    const account = await prisma.financialAccount.findUnique({
      where: { id: accountId },
    });
    if (!account || account.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized for that account" });
    }

    const dt = dateTime ? new Date(dateTime) : new Date();
    if (isNaN(dt.getTime())) {
      return res.status(400).json({ error: "Invalid dateTime" });
    }
    const session = detectSession(dt);

    // create main Trade record
    const newTrade = await prisma.trade.create({
      data: {
        tradeType,
        accountId,
        instrument,
        tradeDirection: direction === "Short" ? "SHORT" : "LONG",
        fees,
        entryDate: dt,
        pattern: pattern || null,
        notes: `session: ${session}`,
      },
    });

    // create sub-trade
    if (tradeType === "FX") {
      let { amountGain, percentageGain } = fx;
      if (amountGain != null && percentageGain != null) {
        // prefer percentage => ignore amountGain
        amountGain = null;
      }
      await prisma.fxTrade.create({
        data: {
          tradeId: newTrade.id,
          amountGain: amountGain ?? null,
          percentageGain: percentageGain ?? null,
        },
      });
    } else if (tradeType === "BOND") {
      // placeholder
      await prisma.bondTrade.create({
        data: {
          tradeId: newTrade.id,
          entryPrice: bond.entryPrice || 0,
          exitPrice: bond.exitPrice || 0,
          quantity: bond.quantity || 0,
          couponRate: bond.couponRate || 0,
          maturityDate: bond.maturityDate ? new Date(bond.maturityDate) : null,
        },
      });
    } else if (tradeType === "STOCK") {
      // placeholder
      await prisma.stocksTrade.create({
        data: {
          tradeId: newTrade.id,
          entryPrice: stock.entryPrice || 0,
          exitPrice: stock.exitPrice || 0,
          quantity: stock.quantity || 0,
        },
      });
    }
    // CRYPTO? etc.

    // recalc
    await recalcAccountBalance(accountId);

    res.json({ message: "Trade created", tradeId: newTrade.id });
  } catch (err) {
    console.error("Error creating trade:", err);
    res.status(500).json({ error: "Failed to create trade" });
  }
});

/**
 * GET /trade
 * Query: accountId, tradeType
 * Returns trades (with sub-trade objects included).
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const accountId = req.query.accountId ? parseInt(req.query.accountId) : null;
    const tType = req.query.tradeType || null;

    // find user accounts
    const userAccounts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    const validIds = userAccounts.map(a => a.id);

    if (accountId && !validIds.includes(accountId)) {
      return res.status(403).json({ error: "Not authorized for that account" });
    }

    const whereClause = {};
    if (accountId) {
      whereClause.accountId = accountId;
    } else {
      whereClause.accountId = { in: validIds };
    }
    if (tType) {
      whereClause.tradeType = tType;
    }

    const trades = await prisma.trade.findMany({
      where: whereClause,
      orderBy: { entryDate: "desc" },
      include: {
        fxTrade: true,
        bondTrade: true,
        stocksTrade: true,
      },
    });
    res.json(trades);
  } catch (err) {
    console.error("Error fetching trades:", err);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

/**
 * GET /trade/advanced-search
 * Query includes startDate, endDate, instrument, direction, tradeType, pattern, page, size
 */
router.get("/advanced-search", authenticate, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      instrument,
      direction,
      tradeType,
      pattern,
      page = 1,
      size = 10,
    } = req.query;
    const pageNum = parseInt(page) || 1;
    let pageSize = parseInt(size) || 10;
    if (![10,20,100].includes(pageSize)) {
      pageSize = 10;
    }

    // find user's account IDs
    const userAccts = await prisma.financialAccount.findMany({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    const validIds = userAccts.map(a => a.id);

    const AND = [
      { accountId: { in: validIds } },
    ];
    if (startDate) {
      const sd = new Date(startDate);
      if (!isNaN(sd.getTime())) {
        AND.push({ entryDate: { gte: sd } });
      }
    }
    if (endDate) {
      const ed = new Date(endDate);
      if (!isNaN(ed.getTime())) {
        AND.push({ entryDate: { lte: ed } });
      }
    }
    if (instrument) {
      AND.push({ instrument });
    }
    if (direction) {
      AND.push({ tradeDirection: direction === "Short" ? "SHORT":"LONG" });
    }
    if (tradeType) {
      AND.push({ tradeType });
    }
    if (pattern) {
      AND.push({ pattern });
    }

    const skip = (pageNum - 1) * pageSize;

    const total = await prisma.trade.count({
      where: { AND },
    });
    const found = await prisma.trade.findMany({
      where: { AND },
      orderBy: { entryDate: "desc" },
      skip,
      take: pageSize,
      include: {
        fxTrade: true,
        bondTrade: true,
        stocksTrade: true,
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    res.json({
      trades: found,
      total,
      page: pageNum,
      size: pageSize,
      totalPages,
    });
  } catch (err) {
    console.error("Error in advanced-search:", err);
    res.status(500).json({ error: "Failed advanced search" });
  }
});

/**
 * PUT /trade/:id
 * Edits an existing trade, updates sub-trade, recalc
 */
router.put("/:id", authenticate, async (req, res) => {
  try {
    const tradeId = parseInt(req.params.id);
    const existing = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { fxTrade: true, bondTrade: true, stocksTrade: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // confirm user
    const acct = await prisma.financialAccount.findUnique({
      where: { id: existing.accountId },
    });
    if (!acct || acct.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const {
      instrument,
      direction,
      fees,
      dateTime,
      pattern,
      fx = {},
      bond = {},
      stock = {},
    } = req.body;

    if (!instrument) {
      return res.status(400).json({ error: "instrument is required" });
    }
    const dt = dateTime ? new Date(dateTime) : existing.entryDate;

    // update main
    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        instrument,
        tradeDirection: direction === "Short" ? "SHORT" : "LONG",
        fees: fees ?? 0,
        entryDate: dt,
        pattern: pattern ?? null,
      },
    });

    // update sub
    if (existing.tradeType === "FX" && existing.fxTrade) {
      let { amountGain, percentageGain } = fx;
      if (amountGain != null && percentageGain != null) {
        // prefer percentage
        amountGain = null;
      }
      await prisma.fxTrade.update({
        where: { tradeId },
        data: {
          amountGain: amountGain ?? null,
          percentageGain: percentageGain ?? null,
        },
      });
    } else if (existing.tradeType === "BOND" && existing.bondTrade) {
      await prisma.bondTrade.update({
        where: { tradeId },
        data: {
          entryPrice: bond.entryPrice ?? existing.bondTrade.entryPrice,
          exitPrice: bond.exitPrice ?? existing.bondTrade.exitPrice,
          quantity: bond.quantity ?? existing.bondTrade.quantity,
          couponRate: bond.couponRate ?? existing.bondTrade.couponRate,
          maturityDate: bond.maturityDate
            ? new Date(bond.maturityDate)
            : existing.bondTrade.maturityDate,
        },
      });
    } else if (existing.tradeType === "STOCK" && existing.stocksTrade) {
      await prisma.stocksTrade.update({
        where: { tradeId },
        data: {
          entryPrice: stock.entryPrice ?? existing.stocksTrade.entryPrice,
          exitPrice: stock.exitPrice ?? existing.stocksTrade.exitPrice,
          quantity: stock.quantity ?? existing.stocksTrade.quantity,
        },
      });
    }

    await recalcAccountBalance(existing.accountId);
    res.json({ message: "Trade updated" });
  } catch (err) {
    console.error("Error updating trade:", err);
    res.status(500).json({ error: "Failed to update trade" });
  }
});

/**
 * DELETE /trade/:id
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const tradeId = parseInt(req.params.id);
    const existing = await prisma.trade.findUnique({
      where: { id: tradeId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Trade not found" });
    }
    const acct = await prisma.financialAccount.findUnique({
      where: { id: existing.accountId },
    });
    if (!acct || acct.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // remove sub-trade
    if (existing.tradeType === "FX") {
      await prisma.fxTrade.deleteMany({ where: { tradeId } });
    } else if (existing.tradeType === "BOND") {
      await prisma.bondTrade.deleteMany({ where: { tradeId } });
    } else if (existing.tradeType === "STOCK") {
      await prisma.stocksTrade.deleteMany({ where: { tradeId } });
    }
    // CRYPTO? etc.

    await prisma.trade.delete({ where: { id: tradeId } });
    await recalcAccountBalance(existing.accountId);
    res.json({ message: "Trade deleted" });
  } catch (err) {
    console.error("Error deleting trade:", err);
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

module.exports = router;
