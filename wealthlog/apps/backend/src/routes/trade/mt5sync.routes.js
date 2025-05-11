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

if (!API_KEY)     console.warn("⚠️ No MT5_SYNC_TOKEN — skipping API key check");
if (!SIGN_SECRET) console.warn("⚠️ No MT5_SYNC_SIGN_SECRET — skipping HMAC check");

function safeEqual(a, b) {
  try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
  catch { return false; }
}
function parseInstrument(sym) {
  return sym.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

router.post("/", async (req, res) => {
  // 0) Dump request for debugging
  console.info("→ MT5SYNC REQUEST HEADERS:", {
    authorization: req.get("Authorization"),
    timestamp:     req.get("X-Timestamp"),
    signature:     req.get("X-Signature"),
  });
  console.info("→ MT5SYNC REQUEST BODY:", req.body);

  // 1) API key
  if (requireApiKey) {
    const [scheme, token] = (req.get("Authorization") || "").split(" ");
    if (scheme !== "Bearer" || token !== API_KEY) {
      console.warn("✋ API key check failed:", scheme, token);
      return res.status(403).json({ error: "Invalid API key" });
    }
  }

  // 2) HMAC
  if (requireHmac) {
    const timestamp = req.get("X-Timestamp");
    const signature = req.get("X-Signature");
    if (!timestamp || !signature) {
      console.warn("✋ Missing HMAC headers:", { timestamp, signature });
      return res.status(400).json({ error: "Missing X-Timestamp or X-Signature" });
    }
    const now = Math.floor(Date.now()/1000), ts = parseInt(timestamp,10);
    if (isNaN(ts) || Math.abs(now - ts) > SIGN_TTL) {
      console.warn("✋ HMAC timestamp stale:", { now, ts });
      return res.status(401).json({ error: "Stale timestamp" });
    }
    const payload = Buffer.from(JSON.stringify(req.body));
    const data    = Buffer.from(timestamp + "." + payload);
    const hmac    = crypto.createHmac("sha256", SIGN_SECRET).update(data).digest("hex");
    if (!safeEqual(hmac, signature)) {
      console.warn("✋ HMAC signature mismatch:", { hmac, signature });
      return res.status(403).json({ error: "Invalid signature" });
    }
  }

  // 3) Parse & validate
  const {
    username, password, accountName,
    ticket, symbol, volume,
    entryPrice = null, exitPrice = null,
    stopLossPips = null, pipsGain = null,
    fees = 0, profit = 0, time: tsSec
  } = req.body;
  if (!username || !password || !accountName || ticket == null || !symbol) {
    console.warn("✋ Missing required fields:", { username, accountName, ticket, symbol });
    return res.status(400).json({ error: "Missing required field(s)" });
  }

  try {
    // 4) Authenticate user
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      console.warn("✋ Unknown user:", username);
      return res.status(403).json({ error: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.warn("✋ Password mismatch for user:", username);
      return res.status(403).json({ error: "Invalid credentials" });
    }

    // 5) Resolve/create account
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
      console.info("ℹ️ Created new account:", accountName, "for user:", username);
    }

    // 6) Deduplicate on MT5 ticket
    const note = `MT5 ticket ${ticket}`;
    const exists = await prisma.trade.findUnique({
      where: { accountId_notes: { accountId: account.id, notes: note } }
    });
    if (exists) {
      console.info("ℹ️ Duplicate ticket, skipping:", ticket);
      return res.json({ ok: true, tradeId: exists.id, duplicate: true });
    }

    // 7) Insert trade
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
  } catch (e) {
    console.error("🔥 MT5SYNC ERROR:", e);
    // expose e.message so your EA sees the real cause
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
