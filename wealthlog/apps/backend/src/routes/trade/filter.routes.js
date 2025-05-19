// src/routes/trade/filter.routes.js
const express = require("express");
const router  = express.Router();
const { prisma } = require("../../lib/prisma");              // ✔ same as other routes
const { authenticate } = require("../../middleware/authenticate"); // ✔ fixed path

/**
 * Build a Prisma `where` clause that is ALWAYS scoped to the
 * logged-in user (via the account relation) plus any optional filters.
 */
function buildWhere(q, userId) {
  const w = {
    tradeType: "FX",
    status:    "CLOSED",
    account:   { is: { userId } },          // ← user-scope
  };

  /* ── optional query-string filters ───────────────────── */
  if (q.accountId) w.accountId = Number(q.accountId);

  if (q.instr) {
    w.instrument = { is: { name: { contains: q.instr, mode: "insensitive" } } };
  }

  if (q.pattern) {
    w.pattern = { is: { name: q.pattern } };
  }

  if (q.dir) w.tradeDirection = q.dir.toUpperCase() === "SHORT" ? "SHORT" : "LONG";

  if (q.from || q.to) {
    w.entryDate = {};
    if (q.from) w.entryDate.gte = new Date(`${q.from}T00:00:00`);
    if (q.to)   w.entryDate.lte = new Date(`${q.to}T23:59:59`);
  }

  /* FX-specific numeric filters */
  const fxAND = [];
  if (+q.minLots) fxAND.push({ lots: { gte: +q.minLots } });
  if (+q.maxLots) fxAND.push({ lots: { lte: +q.maxLots } });
  if (+q.minPct)  fxAND.push({ percentageGain: { gte: +q.minPct / 100 } });
  if (+q.maxPct)  fxAND.push({ percentageGain: { lte: +q.maxPct / 100 } });
  if (fxAND.length) w.fxTrade = { is: { AND: fxAND } };

  return w;
}

/**
 * GET /trade/filter   – returns ONLY the caller’s trades
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;                    // set by authenticate()
    const where  = buildWhere(req.query, userId);

    const { page = "1", size = "10", groupBy } = req.query;
    const p = Math.max(1, +page);
    const s = Math.max(1, +size);

    const total  = await prisma.trade.count({ where });
    const trades = await prisma.trade.findMany({
      where,
      include: { fxTrade: true, instrument: true, pattern: true },
      orderBy: { entryDate: "desc" },
      skip: (p - 1) * s,
      take: s,
    });

    const rows = trades.map(t => ({
      id:             t.id,
      instrument:     t.instrument?.name ?? "",
      entryDate:      t.entryDate.toISOString(),
      tradeDirection: t.tradeDirection,
      lots:           t.fxTrade?.lots ?? null,
      entryPrice:     t.fxTrade?.entryPrice ?? null,
      exitPrice:      t.fxTrade?.exitPrice ?? null,
      stopLossPips:   t.fxTrade?.stopLossPips ?? null,
      pipsGain:       t.fxTrade?.pipsGain ?? null,
      amountGain:     t.fxTrade?.amountGain ?? null,
      percentageGain: t.fxTrade?.percentageGain ?? null,
      fees:           t.fees,
    }));

    /* simple bucket aggregation */
    const keyFn = r =>
      groupBy === "month"     ? r.entryDate.slice(0, 7) :
      groupBy === "direction" ? r.tradeDirection        :
                                r.instrument;

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
      page: p,
      size: s,
      totalPages: Math.ceil(total / s),
    });
  } catch (err) {
    console.error("[FILTER] error:", err);
    res.status(500).json({ error: "Failed to filter trades" });
  }
});

module.exports = router;
