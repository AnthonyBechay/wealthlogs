/***************************  recalc.helper.js  ***************************/
const { prisma } = require('../../lib/prisma');
const { redisClient } = require('../../lib/redis');

/**
 * Rebuilds every balance after `afterDate` (or from day one if omitted).
 *   • writes openingBalance / closingBalance & realizedPL on each Trade
 *   • writes BalanceHistory snapshots so the ledger is fully deterministic
 *
 * If a trade stores percentageGain, its realized $-gain is re-computed
 * every time we replay (so back-dated deposits/withdrawals automatically
 * update the profit).
 */
async function recalcAccountBalance(accountId, { afterDate = null } = {}) {
  return prisma.$transaction(async (tx) => {
    /* 1 ── fetch account */

    if (afterDate) {
      // remove every snapshot we’re about to rebuild
      await tx.balanceHistory.deleteMany({
        where: { accountId, date: { gte: afterDate } }
      });
    }
    const account = await tx.financialAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new Error(`Account ${accountId} not found`);

    // Retrieve the userId from the account before proceeding
    const userId = account.userId;

    /* 2 ── pull events ≥ afterDate */
    const transactions = await tx.transaction.findMany({
      where: {
        OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
        ...(afterDate && { dateTime: { gte: afterDate } }),
      },
      orderBy: { dateTime: 'asc' },
    });

    const trades = await tx.trade.findMany({
      where: {
        accountId,
        status: 'CLOSED', // Only closed trades affect realized P/L and thus balance
        ...(afterDate && { entryDate: { gte: afterDate } }),
      },
      include: { fxTrade: true, stocksTrade: true, bondTrade: true },
      orderBy: { entryDate: 'asc' },
    });

    const events = [
      ...transactions.map((t) => ({ kind: 'transaction', date: t.dateTime, data: t })),
      ...trades.map((t) => ({ kind: 'trade', date: t.entryDate, data: t })),
    ].sort((a, b) => {
      if (a.date.getTime() !== b.date.getTime()) return a.date - b.date;
      // tie-break by database id so order is always deterministic
      return a.data.id - b.data.id;
    });

    if (!events.length) {
      // If no events after the 'afterDate', still update lastRecalculatedAt
      // and potentially invalidate cache if this was triggered by a non-balance changing update
      await tx.financialAccount.update({
        where: { id: accountId },
        data: { lastRecalculatedAt: new Date() },
      });
      await invalidateDashboardCache(userId); // Invalidate even if no events, for consistency
      return account.balance;
    }

    /* 3 ── running balance seed (balance *before* first event) */
    let running = await getBalanceBefore(tx, accountId, events[0].date);

    const jobs = [];

    /* 4 ── replay chronologically */
    for (const ev of events) {
      const opening = running;

      if (ev.kind === 'transaction') {
        running = applyTx(ev.data, accountId, running);

        jobs.push(
          tx.transaction.update({
            where: { id: ev.data.id },
            data: { balanceImpact: running - opening },
          })
        );
      } else {
        /* trade */
        const pl = calculateTradePL(ev.data, opening);
        running += pl;

        jobs.push(
          tx.trade.update({
            where: { id: ev.data.id },
            data: {
              openingBalance: opening,
              realizedPL: pl,
              closingBalance: running,
            },
          })
        );
      }

      /* balance snapshot */
      jobs.push(
        tx.balanceHistory.upsert({
          where: { accountId_date: { accountId, date: ev.date } },
          update: { balance: running },
          create: { accountId, date: ev.date, balance: running }
        })
      );
    }

    /* 5 ── headline balance */
    jobs.push(
      tx.financialAccount.update({
        where: { id: accountId },
        data: { balance: running, lastRecalculatedAt: new Date() },
      })
    );

    await Promise.all(jobs);

    // --- CENTRALIZED CACHE INVALIDATION FOR DASHBOARD ---
    // This ensures that when an account's balance or history changes,
    // the user's overall dashboard data is invalidated.
    await invalidateDashboardCache(userId);

    return running;
  });
}

/*──────────────────── helper functions ────────────────────*/

// Helper to invalidate dashboard cache for a specific user
// Moved this helper outside recalcAccountBalance to be reusable if needed,
// but it's called inside now.
async function invalidateDashboardCache(userId) {
  try {
    await redisClient.del(`networth:summary`); // This key is user-specific but without userId in your frontend, so it's a global key
    console.log(`[Cache Invalidate] Deleted networth:summary (global for user if not user-scoped correctly)`);

    // Assuming your frontend's `networth:${range}` key also needs the userId, let's adjust it
    // If your frontend's SWR key for networth chart is actually `networth:${range}` and is user-agnostic,
    // you might need to invalidate ALL such keys.
    // However, based on the frontend code you provided earlier (`networth:${range}` and `networth:summary`),
    // those SWR keys are constructed without userId in the key itself, BUT the API endpoints
    // in dashboard.js filter by req.user.userId. This means the SWR keys should probably be
    // user-scoped on the frontend too if you have multiple users.
    // For now, I'll assume the SWR keys are `networth:${userId}:${range}` and `networth-summary:${userId}`
    // for proper multi-user caching. If your frontend only ever uses a single user, the original keys might work.

    // Correcting based on typical multi-user app caching strategy (and the `authenticate` middleware)
    // Assuming the SWR keys are conceptually prefixed by user ID on the backend even if not explicit in frontend
    await redisClient.del(`networth-summary:${userId}`); // Specific user's summary
    console.log(`[Cache Invalidate] Deleted networth-summary for user ${userId}`);

    const ranges = ["30d", "90d", "365d", "ytd", "all"];
    for (const r of ranges) {
      await redisClient.del(`networth:${userId}:${r}`); // Specific user's range data
      console.log(`[Cache Invalidate] Deleted networth curve for user ${userId}, range ${r}`);
    }
  } catch (cacheError) {
    console.warn('[Cache Invalidation Error]: Could not invalidate Redis cache:', cacheError.message);
    // Log the error but don't prevent the main function from completing
  }
}


function applyTx(t, id, bal) {
  if (t.toAccountId === id) return bal + t.amount;
  if (t.fromAccountId === id) return bal - t.amount;
  return bal;
}

async function getBalanceBefore(client, accountId, date) {
  const hist = await client.balanceHistory.findFirst({
    where: { accountId, date: { lte: date } },
    orderBy: { date: 'desc' },
  });
  if (hist) return hist.balance;

  const acc = await client.financialAccount.findUnique({ where: { id: accountId } });
  return acc.initialBalance;
}

function calculateTradePL(trade, opening) {
  const fees = trade.fees ?? 0;
  let pl = 0;

  switch (trade.tradeType) {
    case 'FX':
      if (trade.fxTrade) {
        /* amountGain wins; otherwise compute from % */
        pl =
          trade.fxTrade.amountGain ??
          (trade.fxTrade.percentageGain ?? 0) * opening;
      }
      break;

    case 'STOCK':
      pl =
        (trade.stocksTrade.exitPrice - trade.stocksTrade.entryPrice) *
        trade.stocksTrade.quantity;
      break;

    case 'BOND':
      pl =
        (trade.bondTrade.exitPrice - trade.bondTrade.entryPrice) *
        trade.bondTrade.quantity;
      break;

    default:
      break;
  }

  return pl - fees;
}

module.exports = { recalcAccountBalance };
/**************************************************************************/