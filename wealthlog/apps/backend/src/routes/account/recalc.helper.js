// src/routes/account/recalc.helper.js
const { prisma } = require('../../lib/prisma');

/**
 * Recalculates an account's balance by summing all trade impacts
 * @param {number} accountId - The account ID to recalculate
 * @returns {Promise<number>} The new calculated balance
 */
async function recalcAccountBalance(accountId) {
  try {
    // Get all trades for this account
    const trades = await prisma.trade.findMany({
      where: { accountId },
      include: {
        fxTrade: true,
        bondTrade: true,
        stocksTrade: true,
      },
      orderBy: { entryDate: 'asc' }, // Process in chronological order
    });

    // Get the account's initial balance
    const account = await prisma.financialAccount.findUnique({
      where: { id: accountId },
    });
    
    if (!account) {
      throw new Error('Account not found');
    }

    let runningBalance = account.initialBalance || 0;

    // Process each trade
    for (const trade of trades) {
      let tradeImpact = 0;

      // Calculate impact based on trade type
      switch (trade.tradeType) {
        case 'FX':
          if (trade.fxTrade) {
            // Prefer amountGain if provided, otherwise calculate from percentage
            if (trade.fxTrade.amountGain !== null) {
              tradeImpact = parseFloat(trade.fxTrade.amountGain);
            } else if (trade.fxTrade.percentageGain !== null && 
                      trade.fxTrade.lots !== null && 
                      trade.fxTrade.entryPrice !== null) {
              const lotSize = 100000; // Standard FX lot size
              const positionSize = trade.fxTrade.lots * lotSize * trade.fxTrade.entryPrice;
              tradeImpact = (trade.fxTrade.percentageGain / 100) * positionSize;
            }
          }
          break;

        case 'STOCK':
          if (trade.stocksTrade) {
            tradeImpact = trade.stocksTrade.quantity * 
                         (trade.stocksTrade.exitPrice - trade.stocksTrade.entryPrice);
          }
          break;

        case 'BOND':
          if (trade.bondTrade) {
            // Simplified bond calculation - adjust as needed
            const priceDiff = trade.bondTrade.exitPrice - trade.bondTrade.entryPrice;
            tradeImpact = trade.bondTrade.quantity * priceDiff;
            
            // If you want to include coupon payments:
            // const couponPayment = ...;
            // tradeImpact += couponPayment;
          }
          break;

        // Add other trade types as needed
      }

      // Subtract fees
      tradeImpact -= parseFloat(trade.fees || 0);

      // Apply to running balance
      runningBalance += tradeImpact;
    }

    // Update the account with the new balance
    await prisma.financialAccount.update({
      where: { id: accountId },
      data: { balance: runningBalance },
    });

    return runningBalance;
  } catch (error) {
    console.error('Error in recalcAccountBalance:', error);
    throw error; // Re-throw for the route to handle
  }
}

module.exports = { recalcAccountBalance };