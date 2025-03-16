// src/routes/account/recalc.helper.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Recalculate the entire account balance for the given accountId.
 * - Sort all transactions and trades by date ascending
 * - For trades: If tradeType="FX" and fxTrade is present, apply amountGain or percentageGain
 * - Optionally handle BOND or STOCK sub-trades
 */
async function recalcAccountBalance(accountId) {
  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
  });
  if (!account) throw new Error(`Account ${accountId} not found`);

  // 1) Reset the balance to 0 first
  await prisma.financialAccount.update({
    where: { id: accountId },
    data: { balance: 0 },
  });

  // 2) Gather transactions (asc by date)
  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { fromAccountId: accountId },
        { toAccountId: accountId },
      ]
    },
    orderBy: { dateTime: "asc" },
  });

  // 3) Gather trades (asc by entryDate)
  const trades = await prisma.trade.findMany({
    where: { accountId },
    orderBy: { entryDate: "asc" },
    include: {
      fxTrade: true,
      bondTrade: true,
      stocksTrade: true,
    },
  });

  // Combine into a single event array
  const events = [];

  for (const tx of transactions) {
    events.push({
      type: "transaction",
      date: tx.dateTime,
      transaction: tx,
    });
  }
  for (const tr of trades) {
    events.push({
      type: "trade",
      date: tr.entryDate || new Date(),
      trade: tr,
    });
  }

  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = 0;
  for (const event of events) {
    if (event.type === "transaction") {
      const tx = event.transaction;
      if (tx.type === "DEPOSIT" && tx.toAccountId === accountId) {
        runningBalance += tx.amount;
      } else if (tx.type === "WITHDRAW" && tx.fromAccountId === accountId) {
        runningBalance -= tx.amount;
      } else if (tx.type === "TRANSFER") {
        if (tx.fromAccountId === accountId) {
          runningBalance -= tx.amount;
        } else if (tx.toAccountId === accountId) {
          runningBalance += tx.amount;
        }
      }
    } else {
      // event.type === "trade"
      const tr = event.trade;
      // Subtract fees
      runningBalance -= tr.fees;

      // If FX
      if (tr.tradeType === "FX" && tr.fxTrade) {
        const fx = tr.fxTrade;
        // If both exist, prefer percentageGain
        if (fx.percentageGain != null) {
          const gain = runningBalance * fx.percentageGain;
          runningBalance += gain;
        } else if (fx.amountGain != null) {
          runningBalance += fx.amountGain;
        }
      } else if (tr.tradeType === "BOND" && tr.bondTrade) {
        // placeholder: do your BOND logic, e.g. coupon or exit price
      } else if (tr.tradeType === "STOCK" && tr.stocksTrade) {
        // placeholder: handle dividends or exit price etc.
      }
    }
  }

  // Finally update the account's balance
  await prisma.financialAccount.update({
    where: { id: accountId },
    data: { balance: runningBalance },
  });
}

module.exports = {
  recalcAccountBalance,
};
