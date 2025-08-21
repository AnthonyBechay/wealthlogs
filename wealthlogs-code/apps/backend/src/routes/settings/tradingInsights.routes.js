const express = require('express');
const router = express.Router();
const { prisma } = require('../../lib/prisma');
const logger = require('../../lib/logger');

// Get trading insights for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's trading statistics
    const trades = await prisma.trade.findMany({
      where: { userId },
      include: {
        account: true
      }
    });

    // Calculate insights
    const totalTrades = trades.length;
    const winningTrades = trades.filter(trade => trade.profit > 0).length;
    const losingTrades = trades.filter(trade => trade.profit < 0).length;
    const breakEvenTrades = trades.filter(trade => trade.profit === 0).length;
    
    const totalProfit = trades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
    const totalVolume = trades.reduce((sum, trade) => sum + (trade.volume || 0), 0);
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
    const avgWin = winningTrades > 0 
      ? trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0) / winningTrades 
      : 0;
    const avgLoss = losingTrades > 0 
      ? trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0) / losingTrades 
      : 0;
    
    const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

    // Get best and worst trades
    const bestTrade = trades.reduce((best, trade) => 
      (!best || trade.profit > best.profit) ? trade : best, null
    );
    const worstTrade = trades.reduce((worst, trade) => 
      (!worst || trade.profit < worst.profit) ? trade : worst, null
    );

    // Get trading frequency insights
    const tradesByMonth = {};
    trades.forEach(trade => {
      const month = new Date(trade.openTime).toISOString().substring(0, 7);
      tradesByMonth[month] = (tradesByMonth[month] || 0) + 1;
    });

    // Get symbol performance
    const symbolPerformance = {};
    trades.forEach(trade => {
      if (!symbolPerformance[trade.symbol]) {
        symbolPerformance[trade.symbol] = {
          trades: 0,
          profit: 0,
          volume: 0,
          wins: 0,
          losses: 0
        };
      }
      symbolPerformance[trade.symbol].trades++;
      symbolPerformance[trade.symbol].profit += trade.profit || 0;
      symbolPerformance[trade.symbol].volume += trade.volume || 0;
      if (trade.profit > 0) symbolPerformance[trade.symbol].wins++;
      if (trade.profit < 0) symbolPerformance[trade.symbol].losses++;
    });

    // Calculate top performing symbols
    const topSymbols = Object.entries(symbolPerformance)
      .map(([symbol, data]) => ({
        symbol,
        ...data,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    const insights = {
      overview: {
        totalTrades,
        winningTrades,
        losingTrades,
        breakEvenTrades,
        winRate: parseFloat(winRate.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        totalVolume: parseFloat(totalVolume.toFixed(2)),
        avgProfit: parseFloat(avgProfit.toFixed(2)),
        avgWin: parseFloat(avgWin.toFixed(2)),
        avgLoss: parseFloat(avgLoss.toFixed(2)),
        profitFactor: parseFloat(profitFactor.toFixed(2))
      },
      extremes: {
        bestTrade: bestTrade ? {
          symbol: bestTrade.symbol,
          profit: bestTrade.profit,
          openTime: bestTrade.openTime,
          closeTime: bestTrade.closeTime
        } : null,
        worstTrade: worstTrade ? {
          symbol: worstTrade.symbol,
          profit: worstTrade.profit,
          openTime: worstTrade.openTime,
          closeTime: worstTrade.closeTime
        } : null
      },
      tradesByMonth,
      topSymbols,
      lastUpdated: new Date().toISOString()
    };

    res.json(insights);
  } catch (error) {
    logger.error('Error fetching trading insights:', error);
    res.status(500).json({ 
      error: 'Failed to fetch trading insights',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get detailed performance metrics
router.get('/performance', async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, accountId } = req.query;

    const where = { userId };
    
    if (startDate || endDate) {
      where.openTime = {};
      if (startDate) where.openTime.gte = new Date(startDate);
      if (endDate) where.openTime.lte = new Date(endDate);
    }
    
    if (accountId) {
      where.accountId = accountId;
    }

    const trades = await prisma.trade.findMany({
      where,
      orderBy: { openTime: 'asc' }
    });

    // Calculate cumulative profit over time
    let cumulativeProfit = 0;
    const profitOverTime = trades.map(trade => {
      cumulativeProfit += trade.profit || 0;
      return {
        date: trade.closeTime || trade.openTime,
        profit: trade.profit || 0,
        cumulativeProfit: parseFloat(cumulativeProfit.toFixed(2)),
        symbol: trade.symbol
      };
    });

    // Calculate daily statistics
    const dailyStats = {};
    trades.forEach(trade => {
      const date = new Date(trade.openTime).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          trades: 0,
          profit: 0,
          volume: 0,
          wins: 0,
          losses: 0
        };
      }
      dailyStats[date].trades++;
      dailyStats[date].profit += trade.profit || 0;
      dailyStats[date].volume += trade.volume || 0;
      if (trade.profit > 0) dailyStats[date].wins++;
      if (trade.profit < 0) dailyStats[date].losses++;
    });

    res.json({
      profitOverTime,
      dailyStats,
      summary: {
        totalDays: Object.keys(dailyStats).length,
        profitableDays: Object.values(dailyStats).filter(d => d.profit > 0).length,
        bestDay: Object.entries(dailyStats)
          .sort(([, a], [, b]) => b.profit - a.profit)[0],
        worstDay: Object.entries(dailyStats)
          .sort(([, a], [, b]) => a.profit - b.profit)[0]
      }
    });
  } catch (error) {
    logger.error('Error fetching performance metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch performance metrics',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get risk analysis
router.get('/risk', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const trades = await prisma.trade.findMany({
      where: { userId },
      include: { account: true }
    });

    const accounts = await prisma.account.findMany({
      where: { userId }
    });

    // Calculate risk metrics
    const losses = trades.filter(t => t.profit < 0).map(t => t.profit);
    const maxDrawdown = Math.min(...losses, 0);
    
    // Calculate risk per trade
    const riskPerTrade = trades.map(trade => {
      const account = accounts.find(a => a.id === trade.accountId);
      const balance = account?.balance || 0;
      const riskPercent = balance > 0 ? (Math.abs(trade.profit) / balance) * 100 : 0;
      
      return {
        symbol: trade.symbol,
        profit: trade.profit,
        riskPercent: parseFloat(riskPercent.toFixed(2)),
        openTime: trade.openTime
      };
    });

    // Calculate consecutive losses
    let currentStreak = 0;
    let maxLosingStreak = 0;
    let maxWinningStreak = 0;
    let currentWinStreak = 0;

    trades.forEach(trade => {
      if (trade.profit < 0) {
        currentStreak++;
        currentWinStreak = 0;
        maxLosingStreak = Math.max(maxLosingStreak, currentStreak);
      } else if (trade.profit > 0) {
        currentWinStreak++;
        currentStreak = 0;
        maxWinningStreak = Math.max(maxWinningStreak, currentWinStreak);
      }
    });

    res.json({
      riskMetrics: {
        maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
        maxLosingStreak,
        maxWinningStreak,
        avgRiskPerTrade: riskPerTrade.length > 0 
          ? parseFloat((riskPerTrade.reduce((sum, t) => sum + t.riskPercent, 0) / riskPerTrade.length).toFixed(2))
          : 0,
        totalRiskExposure: parseFloat(
          trades.filter(t => !t.closeTime).reduce((sum, t) => sum + Math.abs(t.profit || 0), 0).toFixed(2)
        )
      },
      recentRisks: riskPerTrade.slice(-10).reverse(),
      riskDistribution: {
        low: riskPerTrade.filter(t => t.riskPercent < 1).length,
        medium: riskPerTrade.filter(t => t.riskPercent >= 1 && t.riskPercent < 3).length,
        high: riskPerTrade.filter(t => t.riskPercent >= 3).length
      }
    });
  } catch (error) {
    logger.error('Error fetching risk analysis:', error);
    res.status(500).json({ 
      error: 'Failed to fetch risk analysis',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
