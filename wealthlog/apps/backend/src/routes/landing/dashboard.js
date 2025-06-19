// =============================================
// apps/backend/src/routes/dashboard.js  (CORRECTED WITH REDIS FALLBACK)
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
───────────────────────────────────────────────────────*/
// GET /dashboard/networth?range=30d | 90d | 365d | ytd | all
router.get("/networth", authenticate, async (req, res) => {
  // Define cache key and TTL for this endpoint as well
  const userId = req.user.userId;
  const range = req.query.range || '30d'; // Default range
  const cacheKey = `networth:${userId}:${range}`;
  const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes, adjust as needed

  try {
    let data;

    // --- 1. Try to get data from cache (with specific error handling for Redis) ---
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`[Cache HIT] Networth curve for user ${userId}, range ${range}`);
        return res.json(JSON.parse(cachedData)); // Return immediately if found in cache
      }
    } catch (cacheReadError) {
      console.error('[Cache Read Error] Networth curve (falling back to DB):', cacheReadError.message);
      // Don't throw, just let it proceed to DB fetch
    }

    // --- 2. If not in cache or cache read failed, fetch from DB ---
    console.log(`[Cache MISS] Networth curve for user ${userId}, range ${range}. Fetching from DB.`);
    const from = rangeToFromDate(range);

    // 1) pull every snapshot for the user in range
    const rows = await prisma.balanceHistory.findMany({
      where : {
        account: { userId: userId }, // Use userId from req.user
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
    data = curve; // Assign the computed data

    // --- 3. Try to set data in cache (don't block response if this fails) ---
    try {
      if (data) {
        await redisClient.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(data));
        console.log(`[Cache SET] Networth curve for user ${userId}, range ${range}`);
      }
    } catch (cacheSetError) {
      console.warn('[Cache Set Error] Networth curve (continuing without caching):', cacheSetError.message);
      // Log the error but don't prevent the response
    }

    res.json(data); // Send the data to the frontend
  } catch (dbFetchError) { // This catch block now specifically handles DB or processing errors
    console.error("Dashboard networth error:", dbFetchError);
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
    // --- 1. Try to get data from cache (with specific error handling for Redis) ---
    let cachedData;
    try {
      cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`[Cache HIT] Networth summary for user ${userId}`);
        return res.json(JSON.parse(cachedData)); // Return immediately if found in cache
      }
    } catch (cacheReadError) {
      console.error('[Cache Read Error] Networth summary (falling back to DB):', cacheReadError.message);
      // Don't throw, just let it proceed to DB fetch
    }

    // --- 2. If cache miss or cache read failed, fetch from DB ---
    console.log(`[Cache MISS] Networth summary for user ${userId}. Fetching from DB.`);
    const accounts = await prisma.financialAccount.findMany({
      where : { userId: userId, active: true },
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

    // --- 3. Try to store in cache (don't block response if this fails) ---
    try {
      await redisClient.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(summaryData));
      console.log(`[Cache SET] Networth summary for user ${userId}`);
    } catch (cacheSetError) {
      console.warn('[Cache Set Error] Networth summary (continuing without caching):', cacheSetError.message);
      // Log the error but don't prevent the response
    }

    res.json(summaryData); // Always send the data to the frontend
  } catch (dbFetchError) { // This catch block now specifically handles DB or processing errors
    console.error("Net‑worth summary error:", dbFetchError);
    // Only send 500 if DB fetch or core logic fails, not just cache
    res.status(500).json({ error: "Failed to compute net‑worth summary" });
  }
});

module.exports = router;