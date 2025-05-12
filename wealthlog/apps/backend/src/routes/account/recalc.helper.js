const { prisma } = require('../../lib/prisma');

/**
 * Recalculates account balance with proper sequencing of transactions and trades
 * Records balance history at each significant point
 */
async function recalcAccountBalance(accountId) {
  try {
    // Get all data in chronological order
    const [account, transactions, trades] = await prisma.$transaction([
      prisma.financialAccount.findUnique({
        where: { id: accountId },
        include: {
          balanceHistory: {
            orderBy: { date: 'desc' },
            take: 1
          }
        }
      }),
      prisma.transaction.findMany({
        where: { 
          OR: [
            { toAccountId: accountId },
            { fromAccountId: accountId }
          ]
        },
        orderBy: { dateTime: 'asc' }
      }),
      prisma.trade.findMany({
        where: { accountId },
        include: {
          fxTrade: true,
          stocksTrade: true,
          bondTrade: true
        },
        orderBy: { entryDate: 'asc' }
      })
    ]);

    if (!account) throw new Error('Account not found');

    // Merge and sort all events by date
    const allEvents = [
      ...transactions.map(t => ({ 
        type: 'transaction', 
        data: t, 
        date: t.dateTime 
      })),
      ...trades
        .filter(t => t.status === 'CLOSED')
        .map(t => ({ 
          type: 'trade', 
          data: t, 
          date: t.exitDate || t.updatedAt 
        }))
    ].sort((a, b) => a.date - b.date);

    // Initialize balance tracking
    let currentBalance = account.initialBalance;
    const balanceHistory = [];

    // Process each event in chronological order
    for (const event of allEvents) {
      const preEventBalance = currentBalance;

      if (event.type === 'transaction') {
        const tx = event.data;
        if (tx.toAccountId === accountId) {
          currentBalance += tx.amount;
        } else if (tx.fromAccountId === accountId) {
          currentBalance -= tx.amount;
        }
      } 
      else if (event.type === 'trade') {
        const trade = event.data;
        let pl = 0;

        if (trade.tradeType === 'FX' && trade.fxTrade) {
          const fx = trade.fxTrade;
          if (fx.amountGain !== null) {
            pl = fx.amountGain;
          } else if (fx.percentageGain !== null) {
            // Calculate based on balance at trade opening
            const openingBalance = getBalanceAtDate(
              balanceHistory, 
              trade.entryDate,
              account.initialBalance
            );
            pl = (fx.percentageGain / 100) * openingBalance;
          }
        }
        else if (trade.tradeType === 'STOCK' && trade.stocksTrade) {
          const stock = trade.stocksTrade;
          pl = (stock.exitPrice - stock.entryPrice) * stock.quantity;
        }
        else if (trade.tradeType === 'BOND' && trade.bondTrade) {
          const bond = trade.bondTrade;
          pl = (bond.exitPrice - bond.entryPrice) * bond.quantity;
        }

        // Apply fees and update trade record
        pl -= trade.fees || 0;
        currentBalance += pl;

        // Update realizedPL if not already set
        if (!trade.realizedPL) {
          await prisma.trade.update({
            where: { id: trade.id },
            data: { realizedPL: pl }
          });
        }
      }

      // Record balance snapshot if changed
      if (preEventBalance !== currentBalance) {
        balanceHistory.push({
          date: event.date,
          balance: currentBalance
        });
      }
    }

    // Update account and save balance history
    await prisma.$transaction([
      prisma.financialAccount.update({
        where: { id: accountId },
        data: { 
          balance: currentBalance,
          lastRecalculatedAt: new Date()
        }
      }),
      ...balanceHistory.map(bh => 
        prisma.balanceHistory.create({
          data: {
            accountId,
            date: bh.date,
            balance: bh.balance
          }
        })
      )
    ]);

    return currentBalance;
  } catch (error) {
    console.error('Error in recalcAccountBalance:', error);
    throw error;
  }
}

// Helper to get balance at specific point in time
function getBalanceAtDate(history, date, initialBalance) {
  const snapshot = history
    .filter(bh => bh.date <= date)
    .sort((a, b) => b.date - a.date)[0];
  
  return snapshot ? snapshot.balance : initialBalance;
}

module.exports = { recalcAccountBalance };