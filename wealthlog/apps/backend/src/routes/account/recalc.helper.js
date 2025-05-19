/***************************  recalc.helper.js  ***************************/
const { prisma } = require('../../lib/prisma');

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
        status: 'CLOSED',
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

    if (!events.length) return account.balance;

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
    return running;
  });
}

/*──────────────────── helper functions ────────────────────*/
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
