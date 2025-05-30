/* Binance balances route – 30-May-2025
   Returns: { all, spot, earn, funding, futures }   */

const express  = require("express");
const axios    = require("axios");
const crypto   = require("crypto");
const { Spot } = require("@binance/connector");
const { authenticate } = require("../../middleware/authenticate");

const router = express.Router();
const { BINANCE_API_KEY, BINANCE_API_SECRET } = process.env;
const BASE   = "https://api.binance.com";
const STABLE = ["USDT","BUSD","FDUSD","USDC","TUSD","DAI"];

/* ─── helpers ─────────────────────────────────────────── */
const spotSDK = () => new Spot(BINANCE_API_KEY, BINANCE_API_SECRET);
const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);

/** signed GET */
const signedGet = (path, params = {}) => {
  const qs  = new URLSearchParams({ recvWindow: 60_000, timestamp: Date.now(), ...params });
  const sig = crypto.createHmac("sha256", BINANCE_API_SECRET)
                    .update(qs.toString()).digest("hex");
  const url = `${BASE}${path}?${qs.toString()}&signature=${sig}`;
  return axios.get(url, { headers: { "X-MBX-APIKEY": BINANCE_API_KEY } });
};

const enrich = (rows, px, ch) =>
  rows.map(r => {
    const price = px[r.asset] ?? (STABLE.includes(r.asset) ? 1 : 0);
    return { ...r, price, value: r.qty * price, pct24h: ch[r.asset] ?? 0 };
  });

/* ─── Earn / Savings (all documented endpoints) ───────── */
async function fetchEarn() {
  const defs = [
    { p: "/sapi/v1/simple-earn/flexible/position",     k: "totalAmount" },
    { p: "/sapi/v1/simple-earn/locked/position",       k: "amount"      },
    { p: "/sapi/v1/lending/daily/position",            k: "totalAmount" },
    { p: "/sapi/v1/lending/project/position/list",     k: "amount"      },
    { p: "/sapi/v1/staking/position",                  k: "amount"      },
    { p: "/sapi/v1/lending/auto-invest/plan/list",     k: "subscriptionAmount" },
    { p: "/sapi/v1/eth-staking/position",              k: "amount"      }
  ];

  const raw = [];
  for (const { p, k } of defs) {
    try {
      const r = await signedGet(p);
      const rows = Array.isArray(r.data) ? r.data :
                   Array.isArray(r.data.rows) ? r.data.rows : [];
      rows.forEach(o => {
        const qty = parseFloat(o[k] || 0);
        if (qty > 0) raw.push({ asset: o.asset || o.targetAsset || o.rewardAsset, qty });
      });
    } catch {/* silently ignore */}
  }
  const map = new Map();
  raw.forEach(({ asset, qty }) => map.set(asset, (map.get(asset) || 0) + qty));
  return [...map.entries()].map(([asset, qty]) => ({ asset, qty }));
}

/* ─── Futures balances + open positions qty ──────────── */
async function fetchFutures() {
  const out = [];
  for (const p of ["/fapi/v2/balance", "/dapi/v1/balance"]) {
    try {
      const r = await signedGet(p);
      if (Array.isArray(r.data))
        out.push(...r.data.filter(x => +x.balance > 0)
                          .map(x => ({ asset: x.asset, qty: +x.balance })));
    } catch {/* ignore */}
  }
  try {
    const acc = await signedGet("/fapi/v2/account");
    acc.data.positions
      .filter(p => +p.positionAmt !== 0)
      .forEach(p => {
        const coin = p.symbol.replace(/USDT$|USD$/,"");
        out.push({ asset: coin, qty: Math.abs(+p.positionAmt) });
      });
  } catch {}
  return out;
}

/* ─── build five buckets ─────────────────────────────── */
async function build() {
  const api = spotSDK();

  /* Spot balances */
  const spotRaw = (await api.account()).data.balances
      .filter(b => +b.free + +b.locked > 0)
      .map(b => ({ asset: b.asset, qty: +b.free + +b.locked }));



/* Funding wallet – pure Funding balances */
let fundingRaw = [];
try {
  const r = await spotSDK().fundingWallet();
  fundingRaw = (r.data ?? [])
    .filter(f => +f.free + +f.locked + +f.freeze + +f.withdrawing > 0)
    .map(f => ({
      asset: f.asset,
      qty:   +f.free + +f.locked + +f.freeze + +f.withdrawing
    }));
} catch (err) {
  console.error("funding fetch failed", err?.response?.data || err);
}


      
  /* Futures & Earn */
  const [futuresRaw, earnRaw] = await Promise.all([fetchFutures(), fetchEarn()]);

  /* price & 24 h change maps */
  const px = Object.fromEntries(
    (await api.tickerPrice()).data
      .filter(t => t.symbol.endsWith("USDT"))
      .map(t => [t.symbol.replace("USDT",""), +t.price])
  );
  const ch = Object.fromEntries(
    (await api.ticker24hr()).data
      .filter(s => s.symbol.endsWith("USDT"))
      .map(s => [s.symbol.replace("USDT",""), +s.priceChangePercent])
  );

  const bucket = r => enrich(r, px, ch);
  const Spot    = bucket(spotRaw);
  const Funding = bucket(fundingRaw);
  const Futures = bucket(futuresRaw);
  const Earn    = bucket(earnRaw);

  /* All = merge every bucket */
  const allMap = new Map();
  [spotRaw, fundingRaw, futuresRaw, earnRaw].flat()
    .forEach(({ asset, qty }) =>
      allMap.set(asset, (allMap.get(asset) || 0) + qty));
  const All = bucket([...allMap.entries()].map(([asset, qty]) => ({ asset, qty })));

  /* totals */
  const btcPx = px.BTC || +(await api.tickerPrice("BTCUSDT")).data.price;
  const tot   = xs => ({
    valueUsd: +sum(xs, v => v.value).toFixed(2),
    valueBtc: +(sum(xs, v => v.value) / btcPx).toFixed(6)
  });

  return {
    all    : { assets: All,     totals: tot(All)     },
    spot   : { assets: Spot,    totals: tot(Spot)    },
    earn   : { assets: Earn,    totals: tot(Earn)    },
    funding: { assets: Funding, totals: tot(Funding) },
    futures: { assets: Futures, totals: tot(Futures) }
  };
}

/* ─── route ─────────────────────────────────────────── */
router.get("/balances", authenticate, async (_req, res) => {
  try   { res.json(await build()); }
  catch (e) {
    console.error("binance", e?.response?.data || e);
    res.status(500).json({ error: "binance fetch failed" });
  }
});

module.exports = router;
