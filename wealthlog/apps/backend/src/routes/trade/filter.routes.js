// src/routes/trade/filter.routes.js
const express      = require("express");
const router       = express.Router();
const { prisma }   = require("../../lib/prisma");
const { authenticate } = require("../../lib/auth");   // <- add this

/**
 * Build a Prisma-style `where` clause that always limits results
 * to trades whose *parent account* belongs to the logged-in user.
 */
function buildWhere(q, userId) {
  const w = {
    tradeType: "FX",
    status:    "CLOSED",

    // ←–– hard stop: only accounts owned by this user
    account: { is: { userId } },
  };

  /* optional filters coming from query-string … */
  if (q.accountId) w.accountId = Number(q.accountId);

  if (q.instr) {
    w.instrument = {
      is: { name: { contains: String(q.instr), mode: "insensitive" } },
    };
  }

  if (q.pattern) {
    w.pattern = { is: { name: String(q.pattern) } };
  }

  if (q.dir) w.tradeDirection = q.dir.toUpperCase() === "SHORT" ? "SHORT" : "LONG";

  if (q.from || q.to) {
    w.entryDate = {};
    if (q.from) w.entryDate.gte = new Date(`${q.from}T00:00:00`);
    if (q.to)   w.entryDate.lte = new Date(`${q.to}T23:59:59`);
  }

  /* FX-specific numeric filters */
  const fxAND = [];
  if (q.minLots && !isNaN(+q.minLots)) fxAND.push({ lots: { gte: +q.minLots } });
  if (q.maxLots && !isNaN(+q.maxLots)) fxAND.push({ lots: { lte: +q.maxLots } });
  if (q.minPct  && !isNaN(+q.minPct))  fxAND.push({ percentageGain: { gte: +q.minPct / 100 } });
  if (q.maxPct  && !isNaN(+q.maxPct))  fxAND.push({ percentageGain: { lte: +q.maxPct / 100 } });
  if (fxAND.length) w.fxTrade = { is: { AND: fxAND } };

  return w;
}

/**
 * GET /trade/filter
 * Requires Bearer-token auth and returns ONLY the caller’s trades.
 * Query params: page, size, groupBy, instr, pattern, dir,
 *               from, to, minLots, maxLots, minPct, maxPct
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;        // ← now guaranteed to exist
    const where  = buildWhere(req.query, userId);

    const { page = "1", size = "10", groupBy } = req.query;
    const p = Math.max(1, parseInt(page, 10));
    const s = Math.max(1, parseInt(size, 10));

    /* total rows */
    const total = await prisma.trade.count({ where });

    /* paginated fetch */
    const trades = await prisma.trade.findMany({
      where,
      include: { fxTrade: true, instrument: true, pattern: true },
      orderBy: { entryDate: "desc" },
      skip: (p - 1) * s,
      take: s,
    });

    /* map to frontend shape … (unchanged) */
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

    /* bucket aggregation … (unchanged) */
    const keyFn = r =>
      groupBy === "month"     ? r.entryDate.slice(0, 7)
    : groupBy === "direction" ? r.tradeDirection
    :                          r.instrument;

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

    res.json({
      rows,
      buckets,
      total,
      page:       p,
      size:       s,
      totalPages: Math.ceil(total / s),
    });
  } catch (err) {
    console.error("[FILTER] error:", err);
    res.status(500).json({ error: "Failed to filter trades" });
  }
});

module.exports = router;
