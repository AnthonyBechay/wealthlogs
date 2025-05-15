const express = require("express");
const router  = express.Router();
const { prisma } = require("../../lib/prisma");

/* helper – build where clause */
function buildWhere(q) {
  const w = { tradeType:"FX", status:"CLOSED" };

  if (q.accountId) w.accountId = Number(q.accountId);
  if (q.symbol)    w.instrument = { contains:q.symbol, mode:"insensitive" };
  if (q.dir)       w.tradeDirection = q.dir;
  if (q.pattern)   w.pattern = q.pattern;

  if (q.from || q.to) {
    w.entryDate = {};
    if (q.from) w.entryDate.gte = new Date(q.from+"T00:00:00");
    if (q.to)   w.entryDate.lte = new Date(q.to+"T23:59:59");
  }

  /* numeric fx filters */



const fxAND = [];

if (q.minLots && Number.isFinite(+q.minLots))
  fxAND.push({ lots: { gte: Number(q.minLots) } });

if (q.maxLots && Number.isFinite(+q.maxLots))
  fxAND.push({ lots: { lte: Number(q.maxLots) } });

if (q.minPct && Number.isFinite(+q.minPct))
  fxAND.push({ percentageGain: { gte: Number(q.minPct) / 100 } });

if (q.maxPct && Number.isFinite(+q.maxPct))
  fxAND.push({ percentageGain: { lte: Number(q.maxPct) / 100 } });

if (fxAND.length) w.fxTrade = { is: { AND: fxAND } };   // ← one-to-one uses “is”



  return w;
}


router.get("/", async (req, res) => {
  try {
    const where = buildWhere(req.query);

    /* rows */
    const trades = await prisma.trade.findMany({
      where,
      include: { fxTrade: true },
      orderBy: { entryDate: "desc" },
    });

    const rows = trades.map((t) => ({
      id: t.id,
      instrument: t.instrument,
      entryDate : t.entryDate,
      tradeDirection: t.tradeDirection,
      lots           : t.fxTrade?.lots ?? null,
      entryPrice     : t.fxTrade?.entryPrice ?? null,
      exitPrice      : t.fxTrade?.exitPrice ?? null,
      stopLossPips   : t.fxTrade?.stopLossPips ?? null,
      pipsGain       : t.fxTrade?.pipsGain ?? null,
      amountGain     : t.fxTrade?.amountGain ?? null,
      percentageGain : t.fxTrade?.percentageGain ?? null,
      fees: t.fees,
    }));

    /* group aggregation */
    const keyFn = (r) => {
      switch (req.query.groupBy) {
        case "month":      return r.entryDate.toISOString().slice(0, 7); // YYYY-MM
        case "direction":  return r.tradeDirection;
        default:           return r.instrument;
      }
    };

    const buckets = Object.values(
      rows.reduce((acc, r) => {
        const k = keyFn(r);
        if (!acc[k]) acc[k] = { key: k, count: 0, grossPL: 0, wins: 0 };
        const b = acc[k];
        b.count += 1;
        b.grossPL += r.amountGain ?? 0;
        const pct = r.percentageGain != null ? r.percentageGain*100
                  : r.amountGain != null && r.entryPrice
                  ? r.amountGain / r.entryPrice * 100
                  : 0;
        b.avgPct = (b.avgPct ?? 0) + pct;
        if ((r.amountGain ?? 0) > 0) b.wins += 1;
        return acc;
      }, {})
    ).map(b => ({
      key: b.key,
      count: b.count,
      grossPL: b.grossPL,
      avgPct: b.avgPct / b.count,
      winRate: (b.wins / b.count) * 100,
    }));

    return res.json({ rows, buckets });
  } catch (err) {
    console.error("filter error", err);
    res.status(500).json({ error: "Failed" });
  }
});

/* optional CSV stream */
router.get("/export", async (req, res) => {
  const where = buildWhere(req.query);
  const trades = await prisma.trade.findMany({
    where, include: { fxTrade: true }
  });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=trades.csv");
  res.write("id,symbol,date,dir,lots,amountGain,percentageGain\n");
  trades.forEach(t=>{
    res.write([
      t.id, t.instrument, t.entryDate.toISOString(),
      t.tradeDirection,
      t.fxTrade?.lots ?? "",
      t.fxTrade?.amountGain ?? "",
      t.fxTrade?.percentageGain ?? ""
    ].join(",")+"\n");
  });
  res.end();
});

module.exports = router;
