
/**
 * routes/mt5sync.routes.js
 * Lightweight endpoint that accepts raw deal data from MT5 EA and converts it
 * into WealthLog trades. Auth is performed via shared bearer token.
 */
const express = require("express");
const router = express.Router();
const { prisma } = require('../../lib/prisma');

/**
 * ENV:
 *   MT5_SYNC_TOKEN  – shared token that your EA sends in body.token
 *   MT5_DEFAULT_USER – fallback WealthLog userId if you don’t map tokens->users
 */
const SYNC_TOKEN = process.env.MT5_SYNC_TOKEN || "CHANGE_ME_SECRET";
const DEFAULT_USER = parseInt(process.env.MT5_DEFAULT_USER || "11", 10);

// crude symbol→instrument mapping helper (extend as needed)
function parseInstrument(sym) {
  return sym.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

router.post("/", async (req, res) => {
  try {
    const {
      token,
      ticket,
      symbol,
      volume,
      price,
      profit,
      time,
    } = req.body;

    if (token !== SYNC_TOKEN) {
      return res.status(403).json({ error: "Invalid token" });
    }

    const userId = DEFAULT_USER;

    // upsert default FX account “MT5”
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

    // create trade
    const trade = await prisma.trade.create({
      data: {
        tradeType: "FX",
        accountId: account.id,
        instrument: parseInstrument(symbol),
        tradeDirection: volume > 0 ? "LONG" : "SHORT",
        fees: 0,
        entryDate: new Date(time * 1000),
        notes: `mt5 ticket ${ticket}`,
        fxTrade: {
          create: {
            amountGain: profit,
          },
        },
      },
    });

    res.json({ ok: true, tradeId: trade.id });
  } catch (err) {
    console.error("mt5sync error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
