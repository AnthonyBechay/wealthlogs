// =============================================
// apps/backend/src/routes/dashboard.js  (FULL FILE)
// =============================================
const express      = require("express");
const router       = express.Router();
const { prisma }   = require("../../lib/prisma");
const { authenticate } = require("../../middleware/authenticate");
const { redisClient } = require('../../lib/redis'); // Adjust path if necessary

// ───────────────────────────────────────────────
// helper: convert ?range= query to a JS Date
// accepted: "30d", "90d", "365d", "ytd", "all" (default 30d)
function rangeToFromDate(range) {
  if (!range) return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const lc = String(range).toLowerCase();

  // numeric‑days form, e.g. 15d / 180d / 365d
  if (lc.endsWith("d") && !isNaN(parseInt(lc, 10))) {
    const days = parseInt(lc, 10);
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  // year‑to‑date → Jan‑1 of current year
  if (lc === "ytd") {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1);
  }

  // "all" or anything else ⇒ epoch
  return new Date(0);
}

/*───────────────────────────────────────────────
  NET‑WORTH time‑series based on balanceHistory
───────────────────────────────────────────────*/
// GET /dashboard/networth?range=30d | 90d | 365d | ytd | all
router.get("/networth", authenticate, async (req, res) => {
  try {
    const from = rangeToFromDate(req.query.range);

    // 1) pull every snapshot for the user in range
    const rows = await prisma.balanceHistory.findMany({
      where : {
        account: { userId: req.user.userId },
        date:    { gte: from },
      },
      select: { accountId: true, date: true, balance: true },
      orderBy: [{ accountId: "asc" }, { date: "asc" }],
    });

    // 2) convert snapshots → per‑account deltas
    const deltas = rows.map((r, idx, arr) => {
      const prev = idx > 0 && arr[idx - 1].accountId === r.accountId ? arr[idx - 1] : null;
      const delta = prev ? r.balance - prev.balance : r.balance; // first snapshot acts as opening balance
      return { ...r, delta };
    });

    // 3) group deltas by calendar day
    const byDay = {};
    for (const d of deltas) {
      const day = d.date.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + d.delta;
    }

    // 4) running total → true net‑worth curve
    const sortedDays = Object.keys(byDay).sort();
    const curve = {};
    let cumulative = 0;
    for (const day of sortedDays) {
      cumulative += byDay[day];
      curve[day] = cumulative;
    }

    res.json(curve);
  } catch (e) {
    console.error("Dashboard networth error:", e);
    res.status(500).json({ error: "Failed to compute net worth" });
  }
});

/*───────────────────────────────────────────────
  Net‑worth summary buckets (FX, Liquid, …)
───────────────────────────────────────────────*/
router.get("/networth/summary", authenticate, async (req, res) => {
  const userId = req.user.userId;
  const cacheKey = `networth-summary:${userId}`;
  const CACHE_TTL_SECONDS = 15 * 60; // 15 minutes, adjust as needed

  try {
    // 1. Try to get data from cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`[Cache HIT] Networth summary for user ${userId}`);
      return res.json(JSON.parse(cachedData));
    }

    console.log(`[Cache MISS] Networth summary for user ${userId}. Fetching from DB.`);
    // 2. If cache miss, fetch from DB
    const accounts = await prisma.financialAccount.findMany({
      where : { userId: userId, active: true }, // Ensure userId is correctly used
      select: {
        balance: true,
        accountType: true,
        isLiquid: true,
      },
    });

    const fx       = accounts.filter(a => a.accountType === "FX_COMMODITY")
                             .reduce((s, a) => s + a.balance, 0);
    const liquid   = accounts.filter(a => a.isLiquid)
                             .reduce((s, a) => s + a.balance, 0);
    const global   = accounts.reduce((s, a) => s + a.balance, 0);
    const illiquid = global - liquid;

    const summaryData = { fx, liquid, illiquid, global };

    // 3. Store in cache
    // Use 'EX' for seconds. SETEX automatically sets with expiry.
    await redisClient.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(summaryData));

    res.json(summaryData);
  } catch (e) {
    console.error("Net‑worth summary error:", e);
    // Avoid caching errors
    res.status(500).json({ error: "Failed to compute net‑worth summary" });
  }
});

module.exports = router;
