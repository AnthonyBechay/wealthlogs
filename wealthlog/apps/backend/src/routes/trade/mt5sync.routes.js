/**
 * routes/mt5sync.routes.js
 * Endpoint that accepts raw deal data from MT5 EA and converts it
 * into WealthLog trades. Auth = Bearer API key + HMAC signature.
 */
const express = require("express");
const crypto  = require("crypto");
const router  = express.Router();
const { prisma } = require("../../lib/prisma");

// ── CONFIG ─────────────────────────────────────────────────────────
const API_KEY     = process.env.MT5_SYNC_TOKEN;
const SIGN_SECRET = process.env.MT5_SYNC_SIGN_SECRET;
const SIGN_TTL    = parseInt(process.env.MT5_SYNC_TTL || "300", 10); // seconds
const DEFAULT_USER = parseInt(process.env.MT5_DEFAULT_USER || "11", 10);

if (!API_KEY || !SIGN_SECRET) {
  console.error("⚠️ MT5 sync requires both MT5_SYNC_TOKEN and MT5_SYNC_SIGN_SECRET");
  process.exit(1);
}

// crude symbol→instrument mapping helper (extend as needed)
function parseInstrument(sym) {
  return sym.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// timing-safe compare
function safeEqual(a, b) {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// ── ROUTE ──────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    // 1) Bearer API key
    const auth = (req.get("Authorization") || "").split(" ");
    if (auth[0] !== "Bearer" || auth[1] !== API_KEY) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    // 2) Timestamp + Signature headers
    const timestamp = req.get("X-Timestamp");
    const signature = req.get("X-Signature");
    if (!timestamp || !signature) {
      return res.status(400).json({ error: "Missing X-Timestamp or X-Signature" });
    }

    // 3) Freshness check
    const now = Math.floor(Date.now() / 1000);
    const ts  = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(now - ts) > SIGN_TTL) {
      return res.status(401).json({ error: "Stale timestamp" });
    }

    // 4) Verify HMAC-SHA256(`${timestamp}.${bodyJSON}`)
    const payload = Buffer.from(JSON.stringify(req.body));
    const data    = Buffer.from(timestamp + "." + payload);
    const hmac    = crypto.createHmac("sha256", SIGN_SECRET).update(data).digest("hex");
    if (!safeEqual(hmac, signature)) {
      return res.status(403).json({ error: "Invalid signature" });
    }

    // ── Parse incoming fields ────────────────────────────────────────
    const {
      ticket,
      symbol,
      volume,
      entryPrice   = null,
      exitPrice    = null,
      stopLossPips = null,
      pipsGain     = null,
      profit       = 0,
      time: tsSec,
    } = req.body;

    // 5) Resolve user & account
    const userId = DEFAULT_USER;  // or map token→userId in DB
    let account = await prisma.financialAccount.findFirst({
      where: { userId, name: "MT5" },
    });
    if (!account) {
      account = await prisma.financialAccount.create({
        data: {
          userId,
          name: "MT5",
          accountType: "FX_COMMODITY",
          balance: 0,
          currency: "USD",
        },
      });
    }

    // 6) Create trade + sub-trade
    const trade = await prisma.trade.create({
      data: {
        tradeType:      "FX",
        accountId:      account.id,
        instrument:     parseInstrument(symbol),
        tradeDirection: volume > 0 ? "LONG" : "SHORT",
        fees:           0,
        entryDate:      new Date(tsSec * 1000),
        notes:          `MT5 ticket ${ticket}`,
        fxTrade: {
          create: {
            lots:           volume,
            entryPrice,
            exitPrice,
            stopLossPips,
            pipsGain,
            amountGain:     profit,
            percentageGain: null,
            source:         "MT5 automatic",
          },
        },
      },
    });

    return res.json({ ok: true, tradeId: trade.id });
  } catch (err) {
    console.error("mt5sync error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
