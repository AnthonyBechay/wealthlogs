/* apps/backend/src/routes/trade/binance.routes.js.js */
const express = require("express");
const router  = express.Router();
const { Spot } = require("@binance/connector");     
const { prisma } = require("../../lib/prisma");      
const { authenticate } = require("../../middleware/authenticate");


/*──────────────── CONFIG ───────────────*/
const BINANCE_API_KEY    = process.env.BINANCE_API_KEY;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;

// throw early if keys are missing – safer than a silent 500 later
if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
  console.warn("⚠️  Binance route loaded but API keys are not set");
}

/*───────────── helpers ──────────────*/

/**
 * Returns an array like
 * [{ asset:'BTC', qty:0.5, price:67000, value:33500, pct24h:-1.2 }, …]
 */
async function fetchSpotBalancesWithPrices(client) {
  // 1) account() => all balances
  const { data: account } = await client.account();
  const nonZero = account.balances.filter(
    (b) => parseFloat(b.free) + parseFloat(b.locked) > 0
  );

  // 2) Get one big price map in a single request
  // returns [{symbol:'BTCUSDT',price:'67523.12'}, …]
  const { data: tickers } = await client.tickerPrice();
  const priceMap = Object.fromEntries(
    tickers
      .filter((t) => t.symbol.endsWith("USDT"))
      .map((t) => [t.symbol.replace("USDT", ""), parseFloat(t.price)])
  );

  // 3) (optional) 24h stats for % change
  const { data: stats } = await client.ticker24hr();
  const changeMap = Object.fromEntries(
    stats
      .filter((s) => s.symbol.endsWith("USDT"))
      .map((s) => [
        s.symbol.replace("USDT", ""),
        parseFloat(s.priceChangePercent),
      ])
  );

  // 4) build result
  return nonZero.map((b) => {
    const asset = b.asset;
    const qty   = parseFloat(b.free) + parseFloat(b.locked);
    const price = priceMap[asset] ?? 0;  // if not tradeable vs USDT
    return {
      asset,
      qty,
      price,
      value: qty * price,
      pct24h: changeMap[asset] ?? 0,
    };
  });
}

/*───────────── ROUTES ──────────────*/

/**
 * GET /binance/assets
 * Returns: { totals: {valueUsd, valueBtc}, assets:[…] }
 */
router.get("/assets", authenticate, async (req, res) => {
  try {
    const client  = new Spot(BINANCE_API_KEY, BINANCE_API_SECRET);
    const assets  = await fetchSpotBalancesWithPrices(client);

    const totalUsd = assets.reduce((s, a) => s + a.value, 0);
    const btcPrice = assets.find((a) => a.asset === "BTC")?.price ||
                     (await client.tickerPrice("BTCUSDT")).data.price;
    const totalBtc = btcPrice ? totalUsd / btcPrice : 0;

    res.json({
      totals: { valueUsd: totalUsd, valueBtc: totalBtc },
      assets,
    });
  } catch (err) {
    console.error("Binance fetch error", err?.response?.data || err);
    res.status(500).json({ error: "Failed to fetch Binance balances" });
  }
});

module.exports = router;
