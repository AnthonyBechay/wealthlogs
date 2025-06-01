// src/routes/trade/filter.routes.js
const express = require("express");
const router = express.Router();
const { prisma } = require("../../lib/prisma");
const { authenticate } = require("../../middleware/authenticate");

function buildWhere(q, userId) {
  const w = {
    tradeType: "FX",
    status: "CLOSED", // [cite: 2]
    account: { is: { userId } },
  };

  if (q.accountId) w.accountId = Number(q.accountId);
  if (q.instr) {
    // Assuming FinancialInstrument model has 'name' field
    w.instrument = { is: { name: { contains: q.instr, mode: "insensitive" } } };
  }
  if (q.pattern) {
    // Assuming TradingPattern model has 'name' field
    w.pattern = { is: { name: q.pattern } };
  }
  if (q.dir) w.tradeDirection = q.dir.toUpperCase() === "SHORT" ? "SHORT" : "LONG"; // [cite: 29]
  if (q.from || q.to) {
    w.entryDate = {}; // [cite: 30]
    if (q.from) w.entryDate.gte = new Date(`${q.from}T00:00:00`);
    if (q.to) w.entryDate.lte = new Date(`${q.to}T23:59:59`);
  }

  const fxAND = [];
  if (+q.minLots) fxAND.push({ lots: { gte: +q.minLots } }); // [cite: 36]
  if (+q.maxLots) fxAND.push({ lots: { lte: +q.maxLots } }); // [cite: 36]
  if (+q.minPct) fxAND.push({ percentageGain: { gte: +q.minPct / 100 } }); // [cite: 37] (This refers to FxTrade.percentageGain)
  if (+q.maxPct) fxAND.push({ percentageGain: { lte: +q.maxPct / 100 } }); // [cite: 37]
  if (fxAND.length) w.fxTrade = { is: { AND: fxAND } };

  return w;
}

router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const where = buildWhere(req.query, userId);
    const { page = "1", size = "10", groupBy = "instrument" } = req.query;
    const p = Math.max(1, +page);
    const s = Math.max(1, +size);

    // Fetch all filtered trades for global stats and accurate buckets
    const allFilteredTrades = await prisma.trade.findMany({
      where,
      include: {
        fxTrade: true, // [cite: 34]
        instrument: true, // For instrument name in buckets/grouping [cite: 27]
        // pattern: true, // Include if grouping by pattern is added
      },
      orderBy: { entryDate: "desc" },
    });

    // Calculate Global Stats
    let globalTotalRealizedPL = 0;
    let globalWins = 0;
    let globalSumOfOpeningBalancesForRoB = 0;
    let globalTotalFees = 0;

    allFilteredTrades.forEach(t => {
      const currentPL = t.realizedPL ?? 0; // [cite: 33]
      globalTotalRealizedPL += currentPL;
      if (currentPL > 0) globalWins++;
      if (t.openingBalance && t.openingBalance > 0 && t.realizedPL != null) { // [cite: 33]
        globalSumOfOpeningBalancesForRoB += t.openingBalance;
      }
      globalTotalFees += (t.fees ?? 0); // [cite: 29]
    });

    const globalStats = {
      totalTrades: allFilteredTrades.length,
      totalRealizedPL: globalTotalRealizedPL,
      winRate: allFilteredTrades.length > 0 ? (globalWins / allFilteredTrades.length) * 100 : 0,
      avgReturnOnBalance: globalSumOfOpeningBalancesForRoB > 0 ? (globalTotalRealizedPL / globalSumOfOpeningBalancesForRoB) * 100 : 0,
      totalFees: globalTotalFees,
    };

    // Map all filtered trades for bucket calculation
    const mappedTradesForBuckets = allFilteredTrades.map(t => ({
      id: t.id, // [cite: 26]
      instrument: t.instrument?.name ?? "N/A",
      entryDate: t.entryDate.toISOString(),
      tradeDirection: t.tradeDirection,
      realizedPL: t.realizedPL ?? null,
      tradeSpecificPercentageGain: t.fxTrade?.percentageGain ?? null, // [cite: 37]
      openingBalance: t.openingBalance ?? null,
    }));

    // Bucket Aggregation (from all filtered trades)
    const keyFn = r =>
      groupBy === "month" ? r.entryDate.slice(0, 7) :
      groupBy === "direction" ? r.tradeDirection :
      r.instrument;

    const aggregatedBuckets = Object.values(
      mappedTradesForBuckets.reduce((acc, r) => {
        const k = keyFn(r);
        if (!acc[k]) {
          acc[k] = {
            key: k,
            count: 0,
            totalRealizedPL: 0,
            wins: 0,
            sumOfTradeSpecificPercentageGains: 0,
            sumOfOpeningBalancesForRoB: 0,
          };
        }
        const b = acc[k];
        b.count++;
        const currentPL = r.realizedPL ?? 0;
        b.totalRealizedPL += currentPL;
        if (currentPL > 0) b.wins++;
        if (r.tradeSpecificPercentageGain != null) {
             b.sumOfTradeSpecificPercentageGains += r.tradeSpecificPercentageGain * 100; // Assuming it's stored as decimal e.g. 0.01 for 1%
        }
        if (r.openingBalance && r.openingBalance > 0 && r.realizedPL != null) {
          b.sumOfOpeningBalancesForRoB += r.openingBalance;
        }
        return acc;
      }, {})
    ).map(b => ({
      key: b.key,
      count: b.count,
      grossPL: b.totalRealizedPL,
      avgReturnOnBalance: b.sumOfOpeningBalancesForRoB > 0 ? (b.totalRealizedPL / b.sumOfOpeningBalancesForRoB) * 100 : 0,
      avgTradeSpecificPercentageGain: b.count > 0 ? b.sumOfTradeSpecificPercentageGains / b.count : 0,
      winRate: b.count > 0 ? (b.wins / b.count) * 100 : 0,
    }));

    // Paginated rows for the table (slice from allFilteredTrades)
    const paginatedTradeSubset = allFilteredTrades.slice((p - 1) * s, p * s);

    const rowsForTable = paginatedTradeSubset.map(t => ({
      id: t.id,
      instrument: t.instrument?.name ?? "N/A",
      entryDate: t.entryDate.toISOString(),
      tradeDirection: t.tradeDirection,
      lots: t.fxTrade?.lots ?? null, // [cite: 36]
      entryPrice: t.fxTrade?.entryPrice ?? null, // [cite: 35]
      exitPrice: t.fxTrade?.exitPrice ?? null, // [cite: 35]
      stopLossPips: t.fxTrade?.stopLossPips ?? null, // [cite: 36]
      pipsGain: t.fxTrade?.pipsGain ?? null, // [cite: 36]
      realizedPL: t.realizedPL ?? null, // This is the main P&L
      tradeSpecificPercentageGain: t.fxTrade?.percentageGain ?? null, // Aux P&L from FxTrade
      openingBalance: t.openingBalance ?? null, // For calculating %RoB per trade if needed
      fees: t.fees,
    }));

    res.json({
      rows: rowsForTable,
      buckets: aggregatedBuckets,
      globalStats,
      total: allFilteredTrades.length, // Total matching trades
      page: p,
      size: s,
      totalPages: Math.ceil(allFilteredTrades.length / s),
    });

  } catch (err) {
    console.error("[FILTER] error:", err);
    res.status(500).json({ error: "Failed to filter trades" });
  }
});

module.exports = router;