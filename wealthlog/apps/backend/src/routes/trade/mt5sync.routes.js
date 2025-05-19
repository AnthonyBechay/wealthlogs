// src/routes/mt5sync.routes.js
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const router = express.Router();
const { prisma } = require('../../lib/prisma');
const { recalcAccountBalance } = require('../account/recalc.helper');

/* ────── config ────── */
const API_KEY = process.env.MT5_SYNC_TOKEN;
const SIGN_SECRET = process.env.MT5_SYNC_SIGN_SECRET;
const SIGN_TTL = parseInt(process.env.MT5_SYNC_TTL || '300', 10);

const requireApiKey = !!API_KEY;
const requireHmac = !!SIGN_SECRET;

/* helpers */
const safeEqual = (a, b) => {
  try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
  catch { return false; }
};
const normInstrument = (sym) =>
  sym.toUpperCase().replace(/[^A-Z0-9]/g, '');

const GMT_TO_BEIRUT_MS = 3 * 60 * 60 * 1000; // UTC + 3

/* ────── route ────── */
router.post('/', async (req, res) => {
  /* 1 — API-key */
  if (requireApiKey) {
    const [scheme, token] = (req.get('Authorization') || '').split(' ');
    if (scheme !== 'Bearer' || token !== API_KEY)
      return res.status(403).json({ error: 'Invalid API key' });
  }

  /* 2 — optional HMAC */
  if (requireHmac) {
    const tsHdr = req.get('X-Timestamp');
    const sigHdr = req.get('X-Signature');
    if (!tsHdr || !sigHdr)
      return res.status(400).json({ error: 'Missing X-Timestamp or X-Signature' });

    const now = Math.floor(Date.now() / 1000);
    const ts = Number(tsHdr);
    if (!Number.isFinite(ts) || Math.abs(now - ts) > SIGN_TTL)
      return res.status(401).json({ error: 'Stale timestamp' });

    const payload = Buffer.from(JSON.stringify(req.body));
    const data = Buffer.from(tsHdr + '.' + payload);
    const hmac = crypto.createHmac('sha256', SIGN_SECRET).update(data).digest('hex');
    if (!safeEqual(hmac, sigHdr))
      return res.status(403).json({ error: 'Invalid signature' });
  }

  /* 3 — payload */
  const {
    username, password,
    accountName = 'MT5',
    ticket, symbol,
    volume, entryPrice = null, exitPrice = null,
    stopLossPips = null, pipsGain = null,
    fees = 0, profit = null, pctGain = null,
    time: tsSec,
  } = req.body;

  if (!username || !password || ticket == null || !symbol)
    return res.status(400).json({ error: 'Missing required field(s)' });

  const feeSanitised = fees < 0 ? -fees : fees;

  try {
    /* 4 — user auth */
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(403).json({ error: 'Invalid credentials' });
    const hash = user.passwordHash ?? user.password;
    if (!(await bcrypt.compare(password, hash)))
      return res.status(403).json({ error: 'Invalid credentials' });

    /* 5 — account (auto-create) */
    let account = await prisma.financialAccount.findFirst({
      where: { userId: user.id, name: accountName },
    });
    if (!account) {
      account = await prisma.financialAccount.create({
        data: {
          userId: user.id,
          name: accountName,
          accountType: 'FX_COMMODITY',
          currency: 'USD',
          balance: 0,
          initialBalance: 0,
          isLiquid: true,
        },
      });
    }

    /* 6 — dedupe by MT5 ticket */
    const note = `MT5 ticket ${ticket}`;
    const dup = await prisma.trade.findFirst({
      where: { accountId: account.id, notes: note },
    });
    if (dup) return res.json({ ok: true, duplicate: true, tradeId: dup.id });

    /* 7 — ensure instrument exists / create */
    const instName = normInstrument(symbol);
    const instRow = await prisma.financialInstrument.upsert({
      where: { userId_name: { userId: user.id, name: instName } },
      update: {},
      create: { userId: user.id, name: instName },
    });

    /* 8 — gain fields */
    let amountGain = null, percentageGain = null;
    if (pctGain != null && pctGain !== 0) {
      percentageGain = pctGain / 100;
    } else {
      amountGain = profit ?? 0;
    }

    /* 9 — insert trade */
    const entryDate = new Date(tsSec * 1000);

    const trade = await prisma.trade.create({
      data: {
        tradeType: 'FX',
        accountId: account.id,
        instrumentId: instRow.id,
        tradeDirection: volume >= 0 ? 'LONG' : 'SHORT',
        fees: feeSanitised,
        entryDate,
        notes: note,
        status: 'CLOSED',
        fxTrade: {
          create: {
            lots: Math.abs(volume),
            entryPrice,
            exitPrice,
            stopLossPips,
            pipsGain,
            amountGain,
            percentageGain,
            source: 'MT5 automatic',
          },
        },
      },
    });

    await recalcAccountBalance(account.id, { afterDate: entryDate });
    console.info('✅ MT5 trade imported:', trade.id);
    res.json({ ok: true, tradeId: trade.id });
  } catch (err) {
    console.error('🔥 mt5sync error:', err);
    res.status(500).json({ error: 'Failed to import trade' });
  }
});

module.exports = router;
