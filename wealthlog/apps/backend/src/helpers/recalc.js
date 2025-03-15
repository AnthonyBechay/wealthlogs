// src/helpers/recalc.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get or create a "CASH" account for the given user.
 * Adjust "name" or "accountType" to your liking.
 */
async function getOrCreateCashAccountForUser(userId) {
  let account = await prisma.financialAccount.findFirst({
    where: {
      userId,
      accountType: 'CASH',
      name: 'Main Cash'
    }
  });
  if (!account) {
    account = await prisma.financialAccount.create({
      data: {
        userId,
        name: 'Main Cash',
        accountType: 'CASH',
        balance: 0,
        currency: 'USD',
      }
    });
  }
  return account;
}

/**
 * Recalculate the balance for a single FinancialAccount
 * by iterating over all relevant transactions & trades in chronological order,
 * then persist the final balance to account.balance.
 */
async function recalcAccountBalance(accountId) {
  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId }
  });
  if (!account) throw new Error('Account not found, cannot recalc balance.');

  // Gather transactions
  const txIn = await prisma.transaction.findMany({
    where: { toAccountId: accountId },
    orderBy: { dateTime: 'asc' }
  });
  const txOut = await prisma.transaction.findMany({
    where: { fromAccountId: accountId },
    orderBy: { dateTime: 'asc' }
  });

  const transactionEvents = [
    ...txIn.map(t => ({
      type: 'transaction_in',
      id: t.id,
      dateTime: t.dateTime,
      amount: t.amount
    })),
    ...txOut.map(t => ({
      type: 'transaction_out',
      id: t.id,
      dateTime: t.dateTime,
      amount: t.amount
    }))
  ];

  // Gather trades
  const trades = await prisma.trade.findMany({
    where: { accountId },
    orderBy: { entryDate: 'asc' }
  });

  const tradeEvents = trades.map(tr => ({
    type: 'trade',
    id: tr.id,
    dateTime: tr.entryDate || new Date(),
    fees: tr.fees || 0,
    userPercentage: 0,
    userAmount: tr.amount || 0
  }));

  // Merge & sort
  const allEvents = [...transactionEvents, ...tradeEvents];
  allEvents.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

  let newBalance = 0;
  for (const event of allEvents) {
    const oldBalance = newBalance;
    if (event.type === 'transaction_in') {
      newBalance += event.amount;
    } else if (event.type === 'transaction_out') {
      newBalance -= event.amount;
    } else {
      // It's a trade
      newBalance -= event.fees;
      newBalance += event.userAmount;
      const difference = newBalance - oldBalance;

      // optional: store details in trade notes
      await prisma.trade.update({
        where: { id: event.id },
        data: {
          notes: `Balance before: ${oldBalance} | after: ${newBalance} | delta: ${difference}`
        }
      });
    }
  }

  // finalize
  await prisma.financialAccount.update({
    where: { id: accountId },
    data: { balance: newBalance }
  });
}

module.exports = {
  getOrCreateCashAccountForUser,
  recalcAccountBalance
};
