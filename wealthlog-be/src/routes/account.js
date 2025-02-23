// src/routes/account.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { authenticate } = require('../middleware/authenticate');
const { getOrCreateCashAccountForUser, recalcAccountBalance } = require('../helpers/recalc');




// src/routes/account.js
router.get('/', authenticate, async (req, res) => {
    try {
      const cashAcct = await getOrCreateCashAccountForUser(req.user.userId);
      return res.json({ accountBalance: cashAcct.balance }); // so front end sees "accountBalance"
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch account balance" });
    }
  });
  


// GET transactions for default CASH
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const cashAcct = await getOrCreateCashAccountForUser(req.user.userId);
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromAccountId: cashAcct.id },
          { toAccountId: cashAcct.id }
        ]
      },
      orderBy: { dateTime: 'desc' }
    });
    // Return as 'type' = deposit/withdraw for the front end
    // If fromAccountId == cashAcct.id => "withdraw"
    // If toAccountId   == cashAcct.id => "deposit"

    const mapped = transactions.map((t) => {
      let txType = "withdraw";
      if (t.toAccountId === cashAcct.id) txType = "deposit";
      return {
        id: t.id,
        amount: t.amount,
        type: txType,
        dateTime: t.dateTime,
        currency: t.currency
      };
    });
    res.json(mapped);
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// CREATE transaction (deposit/withdraw) on default CASH
router.post('/transaction', authenticate, async (req, res) => {
  const { amount, type, dateTime, currency } = req.body;
  try {
    const cashAcct = await getOrCreateCashAccountForUser(req.user.userId);

    const data = {
      amount: parseFloat(amount) || 0,
      type, // 'DEPOSIT' or 'WITHDRAW'
      dateTime: dateTime ? new Date(dateTime) : new Date(),
      currency: currency || "USD"
    };
    if (type === "deposit") {
      // or "DEPOSIT" if your enum is uppercase
      data.toAccountId = cashAcct.id;
    } else if (type === "withdraw") {
      data.fromAccountId = cashAcct.id;
    } else {
      return res.status(400).json({ error: "Transaction type must be deposit or withdraw" });
    }

    await prisma.transaction.create({ data });
    await recalcAccountBalance(cashAcct.id);

    res.json({ message: "Transaction successful" });
  } catch (error) {
    console.error("Failed to process transaction:", error);
    res.status(500).json({ error: "Failed to process transaction" });
  }
});

module.exports = router;
