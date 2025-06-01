// src/routes/trade/insights.routes.js
const express   = require("express");
const router    = express.Router();
const { prisma } = require("../../lib/prisma");
const { authenticate } = require("../../middleware/authenticate");

/**
 * GET /trade/insights
 * ?accountId= (optional, filters to one account, must belong to user)
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const acctId = req.query.accountId ? Number(req.query.accountId) : null;

    /* ── validate ownership ─────────────────────────────── */
    const myAccounts = await prisma.financialAccount.findMany({
      where : { userId: req.user.userId },
      select: { id: true }
    });
    const myIds = myAccounts.map(a => a.id);
    if (acctId && !myIds.includes(acctId))
      return res.status(403).json({ error: "Not authorised" });

    /* ── fetch trades & inline gain calc ────────────────── */
    const trades = await prisma.trade.findMany({
      where  : {
        accountId : acctId ? acctId : { in: myIds },
        tradeType : "FX",
      },
      include: { fxTrade: true, instrument: true }
    });

    let grossProfit = 0, grossLoss = 0, wins = 0, losses = 0;
    const byInstr = new Map();   // key → { trades, gross, wins }

    for (const t of trades) {
      /* ---- decide $ gain ---- */
      let gain = 0;
      if (t.fxTrade?.amountGain != null)       gain = t.fxTrade.amountGain;
      else if (t.fxTrade?.percentageGain != null && t.openingBalance != null)
        gain = t.fxTrade.percentageGain * t.openingBalance;

      /* ---- overview buckets ---- */
      if (gain >= 0) { grossProfit += gain; wins++; }
      else           { grossLoss   += gain; losses++; }

      /* ---- instrument buckets ---- */
      const key = t.instrument.name;
      const bk  = byInstr.get(key) || { trades: 0, gross: 0, wins: 0 };
      bk.trades += 1;
      bk.gross  += gain;
      if (gain > 0) bk.wins += 1;
      byInstr.set(key, bk);
    }

    /* ── compute smart KPIs ─────────────────────────────── */
    const tradesTotal   = wins + losses;
    const netPnl        = grossProfit + grossLoss;     // loss is negative
    const winRate       = tradesTotal ? (wins / tradesTotal) * 100 : 0;
    const profitFactor  = grossLoss === 0 ? Infinity : Math.abs(grossProfit / grossLoss);
    const avgPct        = tradesTotal
        ? (100 * netPnl) / tradesTotal / (tradesTotal ? tradesTotal : 1)
        : 0;

    /* ── format instrument list ─────────────────────────── */
    const instrumentStats = Array.from(byInstr.entries()).map(([k, v]) => ({
      instrument : k,
      trades     : v.trades,
      gross      : v.gross,
      winRate    : v.trades ? (v.wins / v.trades) * 100 : 0,
      avgPerTrade: v.trades ? v.gross / v.trades : 0,
    })).sort((a, b) => b.gross - a.gross);             // best first

    res.json({
      totals : {
        trades     : tradesTotal,
        wins,
        losses,
        netPnl,
        grossProfit,
        grossLoss : Math.abs(grossLoss),
        winRate,
        profitFactor: Number.isFinite(profitFactor) ? profitFactor : null,
        avgPctPerTrade: avgPct,
      },
      instrumentStats,
    });
  } catch (err) {
    console.error("Insights failed:", err);
    res.status(500).json({ error: "Failed to compute insights" });
  }
});

module.exports = router;
