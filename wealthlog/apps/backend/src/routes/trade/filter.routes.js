// src/routes/trade/filter.routes.js
const express = require("express");
const router = express.Router();
const { prisma } = require("../../lib/prisma");
const { authenticate } = require("../../middleware/authenticate");

function getTradeSession(utcDate) {
    if (!utcDate) return "N/A";
    const date = new Date(utcDate);
    const hour = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    if (hour >= 9 && hour < 12) return "London";
    if ((hour === 15 && minutes >= 30) || (hour > 15 && hour < 18) || (hour === 18 && minutes < 30)) return "US";
    return "Off-hours";
}

function buildWhere(q, userId) {
  const w = {
    tradeType: "FX",
    status: "CLOSED",
    account: { is: { userId } },
  };
  if (q.accountId && q.accountId.trim() !== "") w.accountId = Number(q.accountId);
  if (q.instr && q.instr.trim() !== "") w.instrument = { is: { name: { contains: q.instr.trim(), mode: "insensitive" } } };
  if (q.pattern && q.pattern.trim() !== "") w.pattern = { is: { name: q.pattern.trim() } };
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
    const { page = "1", size = "10", groupBy = "instrument", session: sessionFilter } = req.query; // size from query
    const p = Math.max(1, +page);
    const s = Math.max(1, +size);

    let allTradesMatchingFilters = await prisma.trade.findMany({
      where,
      include: { fxTrade: true, instrument: true, pattern: true },
      orderBy: { entryDate: "desc" },
    });

    if (sessionFilter && sessionFilter.trim() !== "" && sessionFilter !== "All Sessions") { // Handle "All Sessions"
      allTradesMatchingFilters = allTradesMatchingFilters.filter(t => getTradeSession(t.entryDate) === sessionFilter);
    }
    
    const totalFilteredTrades = allTradesMatchingFilters.length;

    let globalTotalRealizedPL = 0, globalWins = 0, globalSumOfOpeningBalancesForRoB = 0, globalTotalFees = 0;
    let largestWin = 0, largestLoss = 0;
    let totalHoldingPeriodMs = 0, tradesWithHoldingPeriod = 0;
    let totalPnlLong = 0, countLong = 0, winsLong = 0;
    let totalPnlShort = 0, countShort = 0, winsShort = 0;

    allTradesMatchingFilters.forEach(t => {
      const currentPL = t.realizedPL ?? 0;
      globalTotalRealizedPL += currentPL;
      if (currentPL > 0) globalWins++;
      if (t.openingBalance && t.openingBalance > 0 && t.realizedPL != null) {
        globalSumOfOpeningBalancesForRoB += t.openingBalance;
      }
      globalTotalFees += (t.fees ?? 0);
      if (currentPL > largestWin) largestWin = currentPL;
      if (currentPL < largestLoss) largestLoss = currentPL;

      if (t.entryDate && t.exitDate) {
        const entry = new Date(t.entryDate).getTime();
        const exit = new Date(t.exitDate).getTime();
        if (exit > entry) {
          totalHoldingPeriodMs += (exit - entry);
          tradesWithHoldingPeriod++;
        }
      }

      if (t.tradeDirection === "LONG") {
        countLong++;
        totalPnlLong += currentPL;
        if (currentPL > 0) winsLong++;
      } else if (t.tradeDirection === "SHORT") {
        countShort++;
        totalPnlShort += currentPL;
        if (currentPL > 0) winsShort++;
      }
    });

    const globalStats = {
      totalTrades: totalFilteredTrades,
      totalRealizedPL: globalTotalRealizedPL,
      winRate: totalFilteredTrades > 0 ? (globalWins / totalFilteredTrades) * 100 : 0,
      avgReturnOnBalance: globalSumOfOpeningBalancesForRoB > 0 ? (globalTotalRealizedPL / globalSumOfOpeningBalancesForRoB) * 100 : 0,
      totalFees: globalTotalFees,
      largestWin,
      largestLoss,
      avgHoldingPeriodMs: tradesWithHoldingPeriod > 0 ? totalHoldingPeriodMs / tradesWithHoldingPeriod : 0,
      totalPnlLong, countLong, winRateLong: countLong > 0 ? (winsLong / countLong) * 100 : 0,
      totalPnlShort, countShort, winRateShort: countShort > 0 ? (winsShort / countShort) * 100 : 0,
    };

    const mappedTradesForBuckets = allTradesMatchingFilters.map(t => ({
      id: t.id, instrument: t.instrument?.name ?? "N/A", entryDate: t.entryDate.toISOString(),
      tradeDirection: t.tradeDirection, realizedPL: t.realizedPL ?? null,
      tradeSpecificPercentageGain: t.fxTrade?.percentageGain ?? null,
      openingBalance: t.openingBalance ?? null, session: getTradeSession(t.entryDate),
    }));

    const keyFn = r => groupBy === "month" ? r.entryDate.slice(0, 7) : groupBy === "direction" ? r.tradeDirection : groupBy === "session" ? r.session : r.instrument;
    const aggregatedBuckets = Object.values(
      mappedTradesForBuckets.reduce((acc, r) => {
        const k = keyFn(r);
        if (!acc[k]) acc[k] = { key: k, count: 0, totalRealizedPL: 0, wins: 0, sumOfTradeSpecificPercentageGains: 0, sumOfOpeningBalancesForRoB: 0 };
        const b = acc[k];
        b.count++; const currentPL = r.realizedPL ?? 0; b.totalRealizedPL += currentPL;
        if (currentPL > 0) b.wins++;
        if (r.tradeSpecificPercentageGain != null) b.sumOfTradeSpecificPercentageGains += r.tradeSpecificPercentageGain * 100;
        if (r.openingBalance && r.openingBalance > 0 && r.realizedPL != null) b.sumOfOpeningBalancesForRoB += r.openingBalance;
        return acc;
      }, {})
    ).map(b => ({
      key: b.key, count: b.count, grossPL: b.totalRealizedPL,
      avgReturnOnBalance: b.sumOfOpeningBalancesForRoB > 0 ? (b.totalRealizedPL / b.sumOfOpeningBalancesForRoB) * 100 : 0,
      avgTradeSpecificPercentageGain: b.count > 0 && b.sumOfTradeSpecificPercentageGains !== 0 ? b.sumOfTradeSpecificPercentageGains / b.count : 0,
      winRate: b.count > 0 ? (b.wins / b.count) * 100 : 0,
    }));

    const paginatedTradeSubset = allTradesMatchingFilters.slice((p - 1) * s, p * s);
    const rowsForTable = paginatedTradeSubset.map(t => ({
      id: t.id, instrument: t.instrument?.name ?? "N/A", entryDate: t.entryDate.toISOString(),
      exitDate: t.exitDate ? t.exitDate.toISOString() : null, // Add exitDate
      tradeDirection: t.tradeDirection, lots: t.fxTrade?.lots ?? null,
      entryPrice: t.fxTrade?.entryPrice ?? null, exitPrice: t.fxTrade?.exitPrice ?? null,
      stopLossPips: t.fxTrade?.stopLossPips ?? null, realizedPL: t.realizedPL ?? null,
      tradeSpecificPercentageGain: t.fxTrade?.percentageGain ?? null,
      openingBalance: t.openingBalance ?? null, fees: t.fees, session: getTradeSession(t.entryDate),
    }));

    res.json({
      rows: rowsForTable, buckets: aggregatedBuckets, globalStats,
      total: totalFilteredTrades, page: p, size: s, totalPages: Math.ceil(totalFilteredTrades / s),
    });
  } catch (err) {
    console.error("[FILTER] error:", err);
    res.status(500).json({ error: "Failed to filter trades" });
  }
});
module.exports = router;