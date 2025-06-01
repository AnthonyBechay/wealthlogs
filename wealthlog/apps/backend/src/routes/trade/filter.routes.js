// src/routes/trade/filter.routes.js
const express = require("express");
const router = express.Router();
const { prisma } = require("../../lib/prisma");
const { authenticate } = require("../../middleware/authenticate");

// Helper to determine trade session based on UTC entry time
function getTradeSession(utcDate) {
    if (!utcDate) return "N/A";
    const date = new Date(utcDate);
    const hour = date.getUTCHours();
    const minutes = date.getUTCMinutes();

    // London Session: 09:00 UTC to 11:59 UTC
    if (hour >= 9 && hour < 12) {
        return "London";
    }
    // US Session: 15:30 UTC to 18:29 UTC
    if ((hour === 15 && minutes >= 30) || (hour > 15 && hour < 18) || (hour === 18 && minutes < 30)) {
        return "US";
    }
    return "Off-hours";
}


function buildWhere(q, userId) {
  const w = {
    tradeType: "FX",
    status: "CLOSED",
    account: { is: { userId } },
  };

  if (q.accountId && q.accountId.trim() !== "") w.accountId = Number(q.accountId);

  if (q.instr && q.instr.trim() !== "") {
    w.instrument = { is: { name: { contains: q.instr.trim(), mode: "insensitive" } } };
  }

  if (q.pattern && q.pattern.trim() !== "") {
    w.pattern = { is: { name: q.pattern.trim() } };
  }

  if (q.dir && q.dir.trim() !== "") w.tradeDirection = q.dir.toUpperCase() === "SHORT" ? "SHORT" : "LONG";

  if ((q.from && q.from.trim() !== "") || (q.to && q.to.trim() !== "")) {
    w.entryDate = {};
    if (q.from && q.from.trim() !== "") w.entryDate.gte = new Date(q.from.trim() + "T00:00:00.000Z");
    if (q.to && q.to.trim() !== "") w.entryDate.lte = new Date(q.to.trim() + "T23:59:59.999Z");
  }

  const fxAND = [];
  if (q.minLots && q.minLots.trim() !== "" && !isNaN(parseFloat(q.minLots))) fxAND.push({ lots: { gte: parseFloat(q.minLots) } });
  if (q.maxLots && q.maxLots.trim() !== "" && !isNaN(parseFloat(q.maxLots))) fxAND.push({ lots: { lte: parseFloat(q.maxLots) } });
  if (q.minPct && q.minPct.trim() !== "" && !isNaN(parseFloat(q.minPct))) fxAND.push({ percentageGain: { gte: parseFloat(q.minPct) / 100 } });
  if (q.maxPct && q.maxPct.trim() !== "" && !isNaN(parseFloat(q.maxPct))) fxAND.push({ percentageGain: { lte: parseFloat(q.maxPct) / 100 } });
  
  if (fxAND.length) w.fxTrade = { is: { AND: fxAND } };

  return w;
}

router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const where = buildWhere(req.query, userId);
    const { page = "1", size = "10", groupBy = "instrument", session: sessionFilter } = req.query;
    const p = Math.max(1, +page);
    const s = Math.max(1, +size);

    let allTradesMatchingFilters = await prisma.trade.findMany({
      where,
      include: {
        fxTrade: true,
        instrument: true,
        pattern: true, // Keep if pattern grouping/filtering is used
      },
      orderBy: { entryDate: "desc" },
    });

    // Apply session filtering if specified
    if (sessionFilter && sessionFilter.trim() !== "") {
      allTradesMatchingFilters = allTradesMatchingFilters.filter(t => getTradeSession(t.entryDate) === sessionFilter);
    }
    
    const totalFilteredTrades = allTradesMatchingFilters.length;

    // Calculate Global Stats from potentially session-filtered trades
    let globalTotalRealizedPL = 0;
    let globalWins = 0;
    let globalSumOfOpeningBalancesForRoB = 0;
    let globalTotalFees = 0;

    allTradesMatchingFilters.forEach(t => {
      const currentPL = t.realizedPL ?? 0;
      globalTotalRealizedPL += currentPL;
      if (currentPL > 0) globalWins++;
      if (t.openingBalance && t.openingBalance > 0 && t.realizedPL != null) {
        globalSumOfOpeningBalancesForRoB += t.openingBalance;
      }
      globalTotalFees += (t.fees ?? 0);
    });

    const globalStats = {
      totalTrades: totalFilteredTrades,
      totalRealizedPL: globalTotalRealizedPL,
      winRate: totalFilteredTrades > 0 ? (globalWins / totalFilteredTrades) * 100 : 0,
      avgReturnOnBalance: globalSumOfOpeningBalancesForRoB > 0 ? (globalTotalRealizedPL / globalSumOfOpeningBalancesForRoB) * 100 : 0,
      totalFees: globalTotalFees,
    };

    const mappedTradesForBuckets = allTradesMatchingFilters.map(t => ({
      id: t.id,
      instrument: t.instrument?.name ?? "N/A",
      entryDate: t.entryDate.toISOString(), // Keep ISO for internal logic
      tradeDirection: t.tradeDirection,
      realizedPL: t.realizedPL ?? null,
      tradeSpecificPercentageGain: t.fxTrade?.percentageGain ?? null,
      openingBalance: t.openingBalance ?? null,
      session: getTradeSession(t.entryDate), // Add session here
    }));

    // Bucket Aggregation
    const keyFn = r =>
      groupBy === "month" ? r.entryDate.slice(0, 7) :
      groupBy === "direction" ? r.tradeDirection :
      groupBy === "session" ? r.session : // Group by session
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
             b.sumOfTradeSpecificPercentageGains += r.tradeSpecificPercentageGain * 100;
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
      avgTradeSpecificPercentageGain: b.count > 0 && b.sumOfTradeSpecificPercentageGains !== 0 ? b.sumOfTradeSpecificPercentageGains / b.count : 0,
      winRate: b.count > 0 ? (b.wins / b.count) * 100 : 0,
    }));

    // Paginated rows for the table
    const paginatedTradeSubset = allTradesMatchingFilters.slice((p - 1) * s, p * s);

    const rowsForTable = paginatedTradeSubset.map(t => ({
      id: t.id,
      instrument: t.instrument?.name ?? "N/A",
      entryDate: t.entryDate.toISOString(), // Send ISO to frontend, formatting done there
      tradeDirection: t.tradeDirection,
      lots: t.fxTrade?.lots ?? null,
      entryPrice: t.fxTrade?.entryPrice ?? null,
      exitPrice: t.fxTrade?.exitPrice ?? null,
      stopLossPips: t.fxTrade?.stopLossPips ?? null,
      // pipsGain: t.fxTrade?.pipsGain ?? null, // Removed as per request to replace with lots (lots is already here)
      realizedPL: t.realizedPL ?? null,
      tradeSpecificPercentageGain: t.fxTrade?.percentageGain ?? null,
      openingBalance: t.openingBalance ?? null,
      fees: t.fees,
      session: getTradeSession(t.entryDate), // Add session to row data
    }));

    res.json({
      rows: rowsForTable,
      buckets: aggregatedBuckets,
      globalStats,
      total: totalFilteredTrades,
      page: p,
      size: s,
      totalPages: Math.ceil(totalFilteredTrades / s),
    });

  } catch (err) {
    console.error("[FILTER] error:", err);
    res.status(500).json({ error: "Failed to filter trades" });
  }
});

module.exports = router;