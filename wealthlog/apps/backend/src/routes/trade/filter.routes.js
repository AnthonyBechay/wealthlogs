// src/routes/trade/filter.routes.js
const express = require("express");
const router  = express.Router();
const { prisma } = require("../../lib/prisma");

/**
 * Build a Prisma-style `where` clause that filters FX trades
 * by account, instrument name, pattern name, direction, date range,
 * and optional FX-specific numeric ranges.
 */
function buildWhere(q) {
  const w = {
    tradeType: "FX",
    status:    "CLOSED",
  };

  if (q.accountId) {
    w.accountId = Number(q.accountId);
  }

  if (q.instr) {
    // Filter on the related FinancialInstrument.name
    w.instrument = {
      is: {
        name: { contains: String(q.instr), mode: "insensitive" }
      }
    };
  }

  if (q.pattern) {
    // Filter on the related TradingPattern.name
    w.pattern = {
      is: {
        name: String(q.pattern)
      }
    };
  }

  if (q.dir) {
    w.tradeDirection = q.dir.toUpperCase() === "SHORT" ? "SHORT" : "LONG";
  }

  if (q.from || q.to) {
    w.entryDate = {};
    if (q.from) w.entryDate.gte = new Date(q.from + "T00:00:00");
    if (q.to)   w.entryDate.lte = new Date(q.to   + "T23:59:59");
  }

  // FX-specific numeric filters
  const fxAND = [];
  if (q.minLots && !isNaN(+q.minLots)) fxAND.push({ lots: { gte: +q.minLots } });
  if (q.maxLots && !isNaN(+q.maxLots)) fxAND.push({ lots: { lte: +q.maxLots } });
  if (q.minPct  && !isNaN(+q.minPct))  fxAND.push({ percentageGain: { gte: +q.minPct / 100 } });
  if (q.maxPct  && !isNaN(+q.maxPct))  fxAND.push({ percentageGain: { lte: +q.maxPct / 100 } });
  if (fxAND.length) {
    w.fxTrade = { is: { AND: fxAND } };
  }

  return w;
}

/**
 * GET /trade/filter
 * Query params:
 *   page, size, groupBy, instr, pattern, dir, from, to, minLots, maxLots, minPct, maxPct
 */
router.get("/", async (req, res) => {
  try {
    const where = buildWhere(req.query);
    const { page = "1", size = "10", groupBy } = req.query;
    const p = Math.max(1, parseInt(page, 10));
    const s = Math.max(1, parseInt(size, 10));

    // Total matching trades
    const total = await prisma.trade.count({ where });

    // Fetch paginated trades, including FX payload and instrument/pattern relations
    const trades = await prisma.trade.findMany({
      where,
      include: { fxTrade: true, instrument: true, pattern: true },
      orderBy: { entryDate: "desc" },
      skip: (p - 1) * s,
      take: s,
    });

    // Map to frontend shape
    const rows = trades.map(t => ({
      id:             t.id,
      instrument:     t.instrument?.name         || "",
      entryDate:      t.entryDate.toISOString(),
      tradeDirection: t.tradeDirection,
      lots:           t.fxTrade?.lots            ?? null,
      entryPrice:     t.fxTrade?.entryPrice      ?? null,
      exitPrice:      t.fxTrade?.exitPrice       ?? null,
      stopLossPips:   t.fxTrade?.stopLossPips    ?? null,
      pipsGain:       t.fxTrade?.pipsGain        ?? null,
      amountGain:     t.fxTrade?.amountGain      ?? null,
      percentageGain: t.fxTrade?.percentageGain  ?? null,
      fees:           t.fees,
    }));

    // Build aggregation buckets
    const keyFn = r => {
      if (groupBy === "month")     return r.entryDate.slice(0, 7);
      if (groupBy === "direction") return r.tradeDirection;
      return r.instrument;
    };
    const buckets = Object.values(
      rows.reduce((acc, r) => {
        const k = keyFn(r);
        if (!acc[k]) acc[k] = { key: k, count: 0, grossPL: 0, wins: 0, avgPct: 0 };
        const b = acc[k];
        b.count++;
        b.grossPL += r.amountGain ?? 0;
        const pct = (r.percentageGain ?? 0) * 100;
        b.avgPct += pct;
        if ((r.amountGain ?? 0) > 0) b.wins++;
        return acc;
      }, {})
    ).map(b => ({
      key:     b.key,
      count:   b.count,
      grossPL: b.grossPL,
      avgPct:  b.avgPct / b.count,
      winRate: (b.wins / b.count) * 100,
    }));

    // Send back rows, buckets, and pagination info
    res.json({
      rows,
      buckets,
      total,
      page:       p,
      size:       s,
      totalPages: Math.ceil(total / s),
    });
  } catch (err) {
    console.error("filter error", err);
    res.status(500).json({ error: "Failed to filter trades" });
  }
});

module.exports = router;
