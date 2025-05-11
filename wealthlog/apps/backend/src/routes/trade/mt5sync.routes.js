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
const requireHmac   = !!SIGN_SECRET;
if (!API_KEY)     console.warn("⚠️ MT5 sync: MT5_SYNC_TOKEN not set; skipping API key check");
if (!SIGN_SECRET) console.warn("⚠️ MT5 sync: MT5_SYNC_SIGN_SECRET not set; skipping HMAC check");

// timing-safe compare for HMAC
function safeEqual(a, b) {
  try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
  catch { return false; }
}

// normalize symbol → instrument
function parseInstrument(sym) {
  return sym.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

router.post("/", async (req, res) => {
  // 0) debug dump
  console.debug("→ HEADERS:", {
    Authorization: req.get("Authorization"),
    "X-Timestamp":  req.get("X-Timestamp"),
    "X-Signature":  req.get("X-Signature")
  });
  console.debug("→ BODY:", req.body);

  // 1) Bearer API key
  if (requireApiKey) {
    const [scheme, token] = (req.get("Authorization")||"").split(" ");
    if (scheme !== "Bearer" || token !== API_KEY) {
      console.warn("✋ API key invalid:", scheme, token);
      return res.status(403).json({ error: "Invalid API key" });
    }
  }

  // 2) Optional HMAC
  if (requireHmac) {
    const tsHdr = req.get("X-Timestamp"), sigHdr = req.get("X-Signature");
    if (!tsHdr || !sigHdr) {
      console.warn("✋ Missing HMAC headers");
      return res.status(400).json({ error: "Missing X-Timestamp or X-Signature" });
    }
    const now = Math.floor(Date.now()/1000), ts = parseInt(tsHdr, 10);
    if (isNaN(ts) || Math.abs(now - ts) > SIGN_TTL) {
      console.warn("✋ HMAC timestamp stale:", now, ts);
      return res.status(401).json({ error: "Stale timestamp" });
    }
    const payload = Buffer.from(JSON.stringify(req.body));
    const data    = Buffer.from(tsHdr + "." + payload);
    const hmac    = crypto.createHmac("sha256", SIGN_SECRET).update(data).digest("hex");
    if (!safeEqual(hmac, sigHdr)) {
      console.warn("✋ HMAC signature mismatch:", hmac, sigHdr);
      return res.status(403).json({ error: "Invalid signature" });
    }
  }

  // 3) Parse & basic validate
  const {
    username, password, accountName,
    ticket, symbol, volume,
    entryPrice = null, exitPrice = null,
    stopLossPips = null, pipsGain = null,
    fees = 0, profit = 0, time: tsSec
  } = req.body;
  if (!username || !password || !accountName || ticket == null || !symbol) {
    console.warn("✋ Missing fields:", { username, accountName, ticket, symbol });
    return res.status(400).json({ error: "Missing required field(s)" });
  }

  try {
    // 4) Find user
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      console.warn("✋ Unknown user:", username);
      return res.status(403).json({ error: "Invalid credentials" });
    }

    // 5) Pick up the hash field (adjust to your schema)
    const hash = user.passwordHash ?? user.password;
    if (!hash) {
      console.error("🔥 No password hash for user record");
      return res.status(500).json({ error: "User has no password set" });
    }

    // 6) Compare
    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      console.warn("✋ Password mismatch for user:", username);
      return res.status(403).json({ error: "Invalid credentials" });
    }

    // 7) Resolve or create account
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
      console.info("ℹ️ Created account:", accountName);
    }

    // 8) Dedupe on ticket
    const note = `MT5 ticket ${ticket}`;
    const dup  = await prisma.trade.findFirst({
      where: { accountId: account.id, notes: note },
    });
    if (dup) {
      console.info("ℹ️ Duplicate ticket, returning existing:", ticket);
      return res.json({ ok: true, tradeId: dup.id, duplicate: true });
    }

    // 9) Insert trade + fxTrade
    const trade = await prisma.trade.create({
      data: {
        tradeType:      "FX",
        accountId:      account.id,
        instrument:     parseInstrument(symbol),
        tradeDirection: volume > 0 ? "LONG" : "SHORT",
        fees:           fees,
        entryDate:      new Date(tsSec*1000),
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

    console.info("✅ Created trade:", trade.id);
    return res.json({ ok: true, tradeId: trade.id });
  } catch (err) {
    console.error("🔥 mt5sync error:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
