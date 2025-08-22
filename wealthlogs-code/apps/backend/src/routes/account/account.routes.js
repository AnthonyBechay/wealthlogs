// src/routes/account/account.routes.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../../lib/prisma');
const { authenticate } = require('../../middleware/auth.middleware');

// GET all accounts for the authenticated user - MISE À JOUR
router.get('/', authenticate, async (req, res) => {
  try {
   const accounts = await prisma.financialAccount.findMany({
  where: { userId: req.user.userId },
  include: {
    statusHistory: {
      orderBy: { changedAt: 'desc' },
      take: 1,
    },
  },
  orderBy: { createdAt: 'asc' },
});

const accountsWithHistory = accounts.map(acc => ({
  ...acc,
  lastStatusChange: acc.statusHistory?.[0]?.changedAt ?? null,  // safe chaining
}));

res.json(accountsWithHistory);

  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// CREATE a new account
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, accountType, currency } = req.body;
    const newAccount = await prisma.financialAccount.create({
      data: {
        userId: req.user.userId,
        name,
        accountType,
        currency: currency || 'USD',
        balance: 0,
        isLiquid: true,
      },
    });
    res.json(newAccount);
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// UPDATE an existing account (e.g. rename, change currency, etc.)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, accountType, currency, isLiquid, active } = req.body;
    // Check ownership
    const account = await prisma.financialAccount.findUnique({ where: { id: Number(id) } });
    if (!account || account.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized or account not found" });
    }

    const updatedAccount = await prisma.financialAccount.update({
      where: { id: Number(id) },
      data: {
        name: name ?? account.name,
        accountType: accountType ?? account.accountType,
        currency: currency ?? account.currency,
        isLiquid: typeof isLiquid === 'boolean' ? isLiquid : account.isLiquid,
        active: typeof active === 'boolean' ? active : account.active,
      },
    });

    res.json(updatedAccount);
  } catch (error) {
    console.error("Error updating account:", error);
    res.status(500).json({ error: "Failed to update account" });
  }
});

// NOUVELLE ROUTE - Changer le statut d'un compte avec historique
router.patch('/:id/status', authenticate, async (req, res) => {
  const { id } = req.params;
  const { active, reason, comment } = req.body;
  
  try {
    // 1. Récupérer le compte actuel et vérifier la propriété
    const account = await prisma.financialAccount.findFirst({
      where: { 
        id: parseInt(id),
        userId: req.user.userId // Sécurité - vérifier que c'est le bon utilisateur
      }
    });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Vérifier si le statut change vraiment
    if (account.active === active) {
      return res.status(400).json({ 
        error: `Account is already ${active ? 'active' : 'inactive'}` 
      });
    }
    
    // 2. Vérifications business logic
    if (!active && account.balance !== 0) {
      console.warn(`Deactivating account ${id} with non-zero balance: ${account.balance}`);
    }
    
    // 3. Vérifier s'il y a des transactions récentes (optionnel)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTransactions = await prisma.transaction.count({
      where: {
        OR: [
          { fromAccountId: parseInt(id) },
          { toAccountId: parseInt(id) }
        ],
        dateTime: {
          gt: twentyFourHoursAgo
        }
      }
    });
    
    if (!active && recentTransactions > 0) {
      console.warn(`Deactivating account ${id} with ${recentTransactions} recent transactions`);
    }
    
    // 4. Utiliser une transaction Prisma pour assurer la cohérence
    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour le statut du compte
      const updatedAccount = await tx.financialAccount.update({
        where: { id: parseInt(id) },
        data: { active }
      });
      
      // Enregistrer dans l'historique
      await tx.statusHistory.create({
        data: {
          accountId: parseInt(id),
          previousStatus: account.active,
          newStatus: active,
          reason: reason || null,
          comment: comment || null,
          changedBy: req.user?.username || req.user?.email || `User ${req.user.userId}`
        }
      });
      
      return updatedAccount;
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error updating account status:', error);
    res.status(500).json({ 
      error: 'Failed to update account status',
      details: error.message 
    });
  }
});

// NOUVELLE ROUTE - Récupérer l'historique général des statuts
router.get('/status-history', authenticate, async (req, res) => {
  try {
    const statusHistory = await prisma.statusHistory.findMany({
      include: {
        account: {
          select: { id: true, name: true }
        }
      },
      where: {
        account: {
          userId: req.user.userId // Sécurité - seulement les comptes de l'utilisateur
        }
      },
      orderBy: { changedAt: 'desc' }
    });
    
    res.json(statusHistory);
  } catch (error) {
    console.error('Error fetching status history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch status history',
      details: error.message 
    });
  }
});

// NOUVELLE ROUTE - Récupérer l'historique d'un compte spécifique
router.get('/:id/status-history', authenticate, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Vérifier que le compte appartient à l'utilisateur
    const account = await prisma.financialAccount.findFirst({
      where: { 
        id: parseInt(id),
        userId: req.user.userId 
      }
    });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const statusHistory = await prisma.statusHistory.findMany({
      where: { accountId: parseInt(id) },
      orderBy: { changedAt: 'desc' }
    });
    
    res.json(statusHistory);
  } catch (error) {
    console.error('Error fetching account status history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch account status history',
      details: error.message 
    });
  }
});

// DELETE account - MISE À JOUR pour inclure status history
router.delete("/:id", authenticate, async (req, res) => {
  const id = Number(req.params.id);
  const cascade = req.query.cascade === "true";

  const account = await prisma.financialAccount.findUnique({ where: { id } });
  if (!account || account.userId !== req.user.userId)
    return res.status(403).json({ error: "Not authorized or account not found" });

  if (cascade) {
    /* wipe trades & sub-tables */
    const trades = await prisma.trade.findMany({ where: { accountId: id } });

    for (const t of trades) {
      if (t.tradeType === "FX") await prisma.fxTrade.deleteMany({ where: { tradeId: t.id } });
      if (t.tradeType === "BOND") await prisma.bondTrade.deleteMany({ where: { tradeId: t.id } });
      if (t.tradeType === "STOCK") await prisma.stocksTrade.deleteMany({ where: { tradeId: t.id } });
      await prisma.tradeMedia.deleteMany({ where: { tradeId: t.id } });
    }
    await prisma.trade.deleteMany({ where: { accountId: id } });

    /* wipe cash-transactions & balance history */
    await prisma.transaction.deleteMany({
      where: { OR: [{ fromAccountId: id }, { toAccountId: id }] },
    });
    await prisma.balanceHistory.deleteMany({ where: { accountId: id } });
    
    /* wipe status history - NOUVEAU */
    await prisma.statusHistory.deleteMany({ where: { accountId: id } });
  } else {
    /* refuse if balance ≠ 0 */
    if (account.balance !== 0)
      return res
        .status(400)
        .json({ error: "Account balance must be zero or use cascade=true" });
  }

  await prisma.financialAccount.delete({ where: { id } });
  res.json({ message: "Account deleted", cascade });
});

module.exports = router;
