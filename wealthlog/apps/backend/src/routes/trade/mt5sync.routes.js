const express = require("express");
const crypto  = require("crypto");
const bcrypt  = require("bcrypt");
const router  = express.Router();
const { prisma } = require("../../lib/prisma");

// ── CONFIG ─────────────────────────────────────────────────────────
const API_KEY     = process.env.MT5_SYNC_TOKEN;
const SIGN_SECRET = process.env.MT5_SYNC_SIGN_SECRET;
const SIGN_TTL    = parseInt(process.env.MT5_SYNC_TTL || "300", 10);

const requireApiKey = !!API_KEY;
if (!API_KEY) {
  console.warn("⚠️ MT5 sync: MT5_SYNC_TOKEN not set; skipping API key check.");
}

const requireHmac = !!SIGN_SECRET;
if (!SIGN_SECRET) {
  console.warn("⚠️ MT5 sync: MT5_SYNC_SIGN_SECRET not set; skipping HMAC check.");
}

// timing-safe compare
function safeEqual(a, b) {
  try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } 
  catch { return false; }
}

// sanitize symbol to instrument
function parseInstrument(sym) {
  return sym.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

router.post("/", async (req, res) => {
  try {
    // 1) API key (Bearer)
    if (requireApiKey) {
      const auth = (req.get("Authorization") || "").split(" ");
      if (auth[0] !== "Bearer" || auth[1] !== API_KEY) {
        return res.status(403).json({ error: "Invalid API key" });
      }
    }

    // 2) HMAC-SHA256 signature
    if (requireHmac) {
      const timestamp = req.get("X-Timestamp");
      const signature = req.get("X-Signature");
      if (!timestamp || !signature) {
        return res.status(400).json({ error: "Missing X-Timestamp or X-Signature" });
      }
      const now = Math.floor(Date.now() / 1000);
      const ts  = parseInt(timestamp, 10);
      if (isNaN(ts) || Math.abs(now - ts) > SIGN_TTL) {
        return res.status(401).json({ error: "Stale timestamp" });
      }
      const body    = Buffer.from(JSON.stringify(req.body));
      const toSign  = Buffer.from(timestamp + "." + body);
      const hmac    = crypto.createHmac("sha256", SIGN_SECRET).update(toSign).digest("hex");
      if (!safeEqual(hmac, signature)) {
        return res.status(403).json({ error: "Invalid signature" });
      }
    }

    // 3) Parse & validate payload
    const {
      username,
      password,
      accountName,
      ticket,
      symbol,
      volume,
      entryPrice   = null,
      exitPrice    = null,
      stopLossPips = null,
      pipsGain     = null,
      fees         = 0,
      profit       = 0,
      time: tsSec,
    } = req.body;

    if (!username || !password || !accountName || ticket == null || !symbol) {
      return res.status(400).json({ error: "Missing required field" });
    }

    // 4) Authenticate user
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(403).json({ error: "Invalid credentials" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(403).json({ error: "Invalid credentials" });
    }

    // 5) Resolve or create FinancialAccount
    let account = await prisma.financialAccount.findFirst({
      where: { userId: user.id, name: accountName },
    });
    if (!account) {
      account = await prisma.financialAccount.create({
        data: {
          userId:      user.id,
          name:        accountName,
          accountType: "FX_COMMODITY",
          balance:     0,
          currency:    "USD",
        },
      });
    }

    // 6) Deduplicate by ticket via the notes field
    const note = `MT5 ticket ${ticket}`;
    const existing = await prisma.trade.findFirst({
      where: { accountId: account.id, notes: note },
    });
    if (existing) {
      return res.json({ ok: true, tradeId: existing.id, duplicate: true });
    }

    // 7) Create the Trade + FxTrade
    const trade = await prisma.trade.create({
      data: {
        tradeType:      "FX",
        accountId:      account.id,
        instrument:     parseInstrument(symbol),
        tradeDirection: volume > 0 ? "LONG" : "SHORT",
        fees:           fees,
        entryDate:      new Date(tsSec * 1000),
        notes:          note,
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
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
