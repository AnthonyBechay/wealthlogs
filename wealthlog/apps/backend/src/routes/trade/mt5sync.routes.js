const express = require("express");
const crypto  = require("crypto");
const bcrypt  = require("bcrypt");
const router  = express.Router();
const { prisma } = require("../../lib/prisma");
const { recalcAccountBalance } = require("../account/recalc.helper");


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
function parseInstrument(sym) {
  return sym.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/*────────────────────────────── ROUTE ─────────────────────────────*/
router.post("/", async (req, res) => {
  /* 0 – debug log */
  console.debug("↳ MT5 headers", {
    Auth: req.get("Authorization"),
    Ts  : req.get("X-Timestamp"),
    Sig : req.get("X-Signature")
  });
  console.debug("↳ BODY", req.body);

  /* 1 – API-key */
  if (requireApiKey) {
    const [scheme, token] = (req.get("Authorization") || "").split(" ");
    if (scheme !== "Bearer" || token !== API_KEY)
      return res.status(403).json({ error: "Invalid API key" });
  }

  /* 2 – optional HMAC */
  if (requireHmac) {
    const tsHdr = req.get("X-Timestamp"), sigHdr = req.get("X-Signature");
    if (!tsHdr || !sigHdr)
      return res.status(400).json({ error: "Missing X-Timestamp or X-Signature" });

    const now = Math.floor(Date.now() / 1000), ts = Number(tsHdr);
    if (!Number.isFinite(ts) || Math.abs(now - ts) > SIGN_TTL)
      return res.status(401).json({ error: "Stale timestamp" });

    const payload = Buffer.from(JSON.stringify(req.body));
    const data    = Buffer.from(tsHdr + "." + payload);
    const hmac    = crypto.createHmac("sha256", SIGN_SECRET).update(data).digest("hex");
    if (!safeEqual(hmac, sigHdr))
      return res.status(403).json({ error: "Invalid signature" });
  }

  /* 3 – request fields */
  const {
    username, password,
    accountName = "MT5",               // NEW – default
    ticket, symbol,
    volume,                            // lots signed (− = short)
    entryPrice = null,
    exitPrice  = null,
    stopLossPips = null,               // NEW – will map straight to FXTrade
    pipsGain   = null,
    fees = 0,
    profit = null,                     // amountGain ($)
    pctGain = null,                    // NEW – optional % gain
    time: tsSec                        // seconds since epoch
  } = req.body;

  if (!username || !password || ticket == null || !symbol)
    return res.status(400).json({ error: "Missing required field(s)" });

  try {
    /* 4 – user & password */
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(403).json({ error: "Invalid credentials" });

    const hash = user.passwordHash ?? user.password;
    const ok   = await bcrypt.compare(password, hash);
    if (!ok)   return res.status(403).json({ error: "Invalid credentials" });

    /* 5 – account (create “MT5” if not exists) */
    let account = await prisma.financialAccount.findFirst({
      where: { userId: user.id, name: accountName },
    });
    if (!account) {
      account = await prisma.financialAccount.create({
        data: {
          userId: user.id,
          name:   accountName,
          accountType: "FX_COMMODITY",
          currency: "USD",
          balance: 0,
          initialBalance: 0,
          isLiquid: true,
        },
      });
      console.info("ℹ️ Created account:", accountName);
    }

    /* 6 – dedupe on ticket */
    const note = `MT5 ticket ${ticket}`;
    const dup  = await prisma.trade.findFirst({
      where: { accountId: account.id, notes: note },
    });
    if (dup) return res.json({ ok: true, tradeId: dup.id, duplicate: true });

    /* 7 – decide amount vs % */
    let amountGain = null, percentageGain = null;
    if (pctGain != null && pctGain !== 0 && profit != null) {
      percentageGain = pctGain / 100;     // % wins
    } else if (pctGain != null && pctGain !== 0) {
      percentageGain = pctGain / 100;
    } else {
      amountGain = profit ?? 0;           // default to amount ($)
    }

    /* 8 – create trade */
    const trade = await prisma.trade.create({
      data: {
        tradeType      : "FX",
        accountId      : account.id,
        instrument     : parseInstrument(symbol),
        tradeDirection : volume >= 0 ? "LONG" : "SHORT",
        fees,
        entryDate      : new Date(tsSec * 1000),
        notes          : note,
        status         : "CLOSED",
        fxTrade: {
          create: {
            lots           : Math.abs(volume),
            entryPrice,
            exitPrice,
            stopLossPips,                   // NEW – mapped
            pipsGain,
            amountGain,
            percentageGain,
            source: "MT5 automatic",
          },
        },
      },
    });
    await recalcAccountBalance(account.id, { afterDate: entryDate });  // NEW

    console.info("✅ MT5 trade imported:", trade.id);
    res.json({ ok: true, tradeId: trade.id });
  } catch (err) {
    console.error("🔥 mt5sync error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
