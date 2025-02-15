/************************************************************
 *  SETUP & DEPENDENCIES
 ************************************************************/
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config(); // Loads environment variables from .env

/************************************************************
 *  INITIALIZATION
 ************************************************************/
const app = express();                  // Create Express app
const prisma = new PrismaClient();      // Instantiate Prisma client
const PORT = 5000;                      // Server listening port
const SECRET_KEY = process.env.SECRET_KEY; // Secret key for JWT from environment variables

/************************************************************
 *  MIDDLEWARE
 ************************************************************/
// Enables CORS for cross-origin requests
app.use(cors());

// Parses incoming requests with JSON payloads
app.use(express.json());

/************************************************************
 *  HELPER FUNCTION TO RECALCULATE USER BALANCE
 ************************************************************/
/**
 * Recalculate the user's entire account balance by iterating over:
 * - All transactions (deposit/withdraw)
 * - All trades
 * in chronological order by dateTime.
 */
async function recalcUserBalance(userId) {
    // 1) Confirm the user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found, cannot recalc balance.");
  
    // 2) Fetch transactions & trades in chronological order
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { dateTime: 'asc' }
    });
    const trades = await prisma.trade.findMany({
      where: { userId },
      orderBy: { dateTime: 'asc' }
    });
  
    const transactionEvents = transactions.map(t => ({
      type: 'transaction',
      id: t.id,
      dateTime: t.dateTime,
      amount: t.amount,
      transactionType: t.type // "deposit" or "withdraw"
    }));
  
    const tradeEvents = trades.map(tr => ({
      type: 'trade',
      id: tr.id,
      dateTime: tr.dateTime,
      fees: tr.fees || 0,
      userPercentage: tr.percentage || 0, // user typed
      userAmount: tr.amount || 0,        // user typed (will be overwritten)
    }));
  
    const allEvents = [...transactionEvents, ...tradeEvents];
    allEvents.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  
    // 3) Start from 0
    let newBalance = 0;
  
    // 4) Iterate
    for (const event of allEvents) {
      const oldBalance = newBalance;
  
      if (event.type === 'transaction') {
        // deposit or withdraw
        if (event.transactionType === 'deposit') {
          newBalance += event.amount;
        } else {
          newBalance -= event.amount;
        }
      } else {
        // It's a trade
        const fees = event.fees;
        newBalance -= fees;
  
        if (event.userPercentage !== 0) {
          // user typed a percentage
          newBalance = newBalance * (1 + event.userPercentage / 100);
        } else {
          // user typed an amount
          newBalance += event.userAmount;
        }
  
        const difference = newBalance - oldBalance;
  
        // If user typed only an amount, let's compute the final percentage
        let finalPercentage = event.userPercentage;
        if (finalPercentage === 0 && oldBalance !== 0) {
          finalPercentage = (difference / oldBalance) * 100;
        }
  
        // 5) Update the trade with the new data
        await prisma.trade.update({
          where: { id: event.id },
          data: {
            balanceBeforeTrade: oldBalance,
            balanceAfterTrade: newBalance,
            amount: difference,       // final difference
            percentage: finalPercentage,
          }
        });
      }
    }
  
    // 6) Final user balance
    await prisma.user.update({
      where: { id: userId },
      data: { accountBalance: newBalance }
    });
  }
  
  
  

/************************************************************
 *  AUTHENTICATION ROUTES
 ************************************************************/

/**
 * REGISTER a new user.
 * Body params: username, password, role
 */
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
        accountBalance: 0
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'User already exists' });
  }
});

/**
 * LOGIN an existing user.
 * Body params: username, password
 */
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Sign a token with user ID and role
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    SECRET_KEY,
    { expiresIn: '1h' }
  );
  res.json({ token });
});

/************************************************************
 *  AUTHENTICATION MIDDLEWARE
 ************************************************************/
const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/************************************************************
 *  TRADE ROUTES
 ************************************************************/

/**
 * Determine session by hour (you can keep or adjust this logic)
 */
function detectSession(dateString) {
  const d = dateString ? new Date(dateString) : new Date();
  const hour = d.getHours();

  if (hour >= 10 && hour <= 12) return "London";
  if (hour >= 16 && hour <= 19) return "US";
  return "Other";
}

/**
 * ADD a new trade record (possibly backdated).
 * Body: { instrument, percentage, amount, fees, dateTime, pattern, direction }
 */


app.post('/trades', authenticate, async (req, res) => {
    const {
      instrument,
      percentage = 0,
      amount = 0,
      fees = 0,
      dateTime,
      pattern = "",
      direction = "Long"
    } = req.body;
  
    // Validate
    if (!instrument) {
      return res.status(400).json({ error: "Instrument is required" });
    }
  
    const p = parseFloat(percentage);
    const a = parseFloat(amount);
  
    // If both p and a are 0 => error
    if (p === 0 && a === 0) {
      return res.status(400).json({ error: "Must provide either percentage or amount." });
    }
  
    let finalPercentage = 0;
    let finalAmount = 0;
  
    if (p !== 0 && a !== 0) {
      // If both => choose percentage, ignore amount
      finalPercentage = p;
      finalAmount = 0;
    } else if (p !== 0) {
      finalPercentage = p;
      finalAmount = 0;
    } else {
      finalPercentage = 0;
      finalAmount = a;
    }
  
    try {
      const tradeTime = dateTime ? new Date(dateTime) : new Date();
      const session = detectSession(tradeTime);
  
      await prisma.trade.create({
        data: {
          instrument,
          session,
          percentage: finalPercentage,
          amount: finalAmount,
          fees,
          dateTime: tradeTime,
          pattern,
          direction,
          userId: req.user.userId,
          balanceBeforeTrade: 0, // We'll fill this after recalc
        }
      });
  
      await recalcUserBalance(req.user.userId);
  
      res.json({ message: "Trade added" });
    } catch (error) {
      console.error("Error adding trade:", error);
      res.status(500).json({ error: "Failed to add trade" });
    }
  });
  


/**
 * GET all trades, ordered by date descending
 */
app.get('/trades', authenticate, async (req, res) => {
  try {
    const trades = await prisma.trade.findMany({
      where: { userId: req.user.userId },
      orderBy: { dateTime: 'desc' }
    });
    res.json(trades);
  } catch (error) {
    console.error("Error fetching trades:", error);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

/**
 * EDIT a trade
 * Body: { instrument, percentage, amount, fees, dateTime, pattern, direction }
 */
app.put('/trades/:id', authenticate, async (req, res) => {
    const {
      instrument,
      percentage = 0,
      amount = 0,
      fees = 0,
      dateTime,
      pattern = "",
      direction = "Long"
    } = req.body;
  
    if (!instrument) {
      return res.status(400).json({ error: "Instrument is required" });
    }
  
    const p = parseFloat(percentage);
    const a = parseFloat(amount);
  
    if (p === 0 && a === 0) {
      return res.status(400).json({ error: "Must provide either percentage or amount." });
    }
  
    let finalPercentage = 0;
    let finalAmount = 0;
    if (p !== 0 && a !== 0) {
      finalPercentage = p;
      finalAmount = 0;
    } else if (p !== 0) {
      finalPercentage = p;
    } else {
      finalAmount = a;
    }
  
    try {
      const tradeTime = dateTime ? new Date(dateTime) : new Date();
      const session = detectSession(tradeTime);
  
      await prisma.trade.update({
        where: { id: parseInt(req.params.id) },
        data: {
          instrument,
          session,
          percentage: finalPercentage,
          amount: finalAmount,
          fees,
          dateTime: tradeTime,
          pattern,
          direction
        }
      });
  
      await recalcUserBalance(req.user.userId);
  
      res.json({ message: "Trade updated" });
    } catch (error) {
      console.error("Error updating trade:", error);
      res.status(500).json({ error: "Failed to update trade" });
    }
  });
  



/**
 * DELETE a trade
 */
app.delete('/trades/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    // 1) Delete
    await prisma.trade.delete({ where: { id: parseInt(id) } });

    // 2) Recalc
    await recalcUserBalance(req.user.userId);

    res.json({ message: "Trade deleted successfully" });
  } catch (error) {
    console.error("Error deleting trade:", error);
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

/************************************************************
 *  ACCOUNT ROUTES
 ************************************************************/

/**
 * GET user account balance
 */
app.get('/account', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { accountBalance: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch account balance" });
  }
});

/************************************************************
 *  TRANSACTION ROUTES
 ************************************************************/

/**
 * CREATE a transaction (deposit/withdraw).
 * Body: { amount, type, dateTime, currency }
 */
app.post('/account/transaction', authenticate, async (req, res) => {
  const { amount, type, dateTime, currency } = req.body;

  try {
    // 1) Insert transaction
    await prisma.transaction.create({
      data: {
        userId: req.user.userId,
        amount: amount,
        type: type,  // 'deposit' or 'withdraw'
        dateTime: dateTime ? new Date(dateTime) : new Date(),
        currency: currency || "USD"
      }
    });

    // 2) Recalc
    await recalcUserBalance(req.user.userId);

    res.json({ message: "Transaction successful" });
  } catch (error) {
    console.error("Failed to process transaction:", error);
    res.status(500).json({ error: "Failed to process transaction" });
  }
});

/**
 * GET transaction history
 */
app.get('/account/transactions', authenticate, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.userId },
      orderBy: { dateTime: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

/************************************************************
 *  SETTINGS ROUTES
 ************************************************************/

/**
 * GET user settings: instruments, patterns, beMin, beMax
 */
app.get('/settings', authenticate, async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
    });

    // If none, create default
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          userId: req.user.userId,
          instruments: [],
          patterns: [],
          beMin: -0.2,
          beMax: 0.3
        }
      });
    }

    res.json({
      instruments: settings.instruments || [],
      patterns: settings.patterns || [],
      beMin: settings.beMin,
      beMax: settings.beMax
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

/**
 * Update ONLY the break-even range
 * Body: { beMin, beMax }
 */
app.post('/settings/beRange/update', authenticate, async (req, res) => {
  const { beMin, beMax } = req.body;
  
  // Validate
  if (beMin >= beMax) {
    return res.status(400).json({ error: "beMin must be less than beMax" });
  }

  try {
    let userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId },
    });

    if (!userSettings) {
      userSettings = await prisma.settings.create({
        data: {
          userId: req.user.userId,
          instruments: [],
          patterns: [],
          beMin,
          beMax,
        },
      });
    } else {
      userSettings = await prisma.settings.update({
        where: { userId: req.user.userId },
        data: { beMin, beMax },
      });
    }

    res.json(userSettings);
  } catch (error) {
    console.error("Error updating BE range:", error);
    res.status(500).json({ error: "Failed to update BE range" });
  }
});

/************************************************************
 *  INSTRUMENTS ROUTES
 ************************************************************/
app.post('/settings/instruments/add', authenticate, async (req, res) => {
  const { instrument } = req.body;

  if (!instrument || typeof instrument !== 'string') {
    return res.status(400).json({ error: "Invalid or missing 'instrument' field." });
  }

  try {
    // Find or create settings
    let userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
    });
    if (!userSettings) {
      userSettings = await prisma.settings.create({
        data: {
          userId: req.user.userId,
          instruments: [],
          patterns: [],
          beMin: -0.2,
          beMax: 0.3
        }
      });
    }

    const updatedInstruments = Array.isArray(userSettings.instruments)
      ? [...userSettings.instruments]
      : [];

    if (!updatedInstruments.includes(instrument)) {
      updatedInstruments.push(instrument);
    }

    const updatedSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { instruments: updatedInstruments }
    });

    res.json({
      message: "Instrument added successfully",
      instruments: updatedSettings.instruments
    });
  } catch (error) {
    console.error("Error adding instrument:", error);
    res.status(500).json({ error: "Failed to add instrument" });
  }
});

app.post('/settings/instruments/edit', authenticate, async (req, res) => {
  const { oldInstrument, newInstrument } = req.body;
  if (!oldInstrument || !newInstrument) {
    return res.status(400).json({ error: "Missing oldInstrument or newInstrument." });
  }

  try {
    const userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
    });
    if (!userSettings) {
      return res.status(404).json({ error: "Settings not found." });
    }

    const currentInstruments = Array.isArray(userSettings.instruments)
      ? [...userSettings.instruments]
      : [];

    const index = currentInstruments.indexOf(oldInstrument);
    if (index === -1) {
      return res.status(404).json({ error: "Instrument to edit not found." });
    }

    currentInstruments[index] = newInstrument;

    const updatedSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { instruments: currentInstruments }
    });

    res.json({
      message: "Instrument updated successfully",
      instruments: updatedSettings.instruments
    });
  } catch (error) {
    console.error("Error editing instrument:", error);
    res.status(500).json({ error: "Failed to edit instrument" });
  }
});

app.post('/settings/instruments/delete', authenticate, async (req, res) => {
  const { instrument } = req.body;
  if (!instrument) {
    return res.status(400).json({ error: "Missing 'instrument' field." });
  }

  try {
    const userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
    });
    if (!userSettings) {
      return res.status(404).json({ error: "Settings not found." });
    }

    const currentInstruments = Array.isArray(userSettings.instruments)
      ? [...userSettings.instruments]
      : [];

    const updatedInstruments = currentInstruments.filter((inst) => inst !== instrument);

    const updatedSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { instruments: updatedInstruments }
    });

    res.json({
      message: "Instrument deleted successfully",
      instruments: updatedSettings.instruments
    });
  } catch (error) {
    console.error("Error deleting instrument:", error);
    res.status(500).json({ error: "Failed to delete instrument" });
  }
});

/************************************************************
 *  PATTERNS ROUTES
 ************************************************************/
app.post('/settings/patterns/add', authenticate, async (req, res) => {
  const { pattern } = req.body;
  if (!pattern || typeof pattern !== 'string') {
    return res.status(400).json({ error: "Invalid or missing 'pattern' field." });
  }

  try {
    let userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
    });
    if (!userSettings) {
      userSettings = await prisma.settings.create({
        data: {
          userId: req.user.userId,
          instruments: [],
          patterns: [],
          beMin: -0.2,
          beMax: 0.3
        }
      });
    }

    const updatedPatterns = Array.isArray(userSettings.patterns)
      ? [...userSettings.patterns]
      : [];

    if (!updatedPatterns.includes(pattern)) {
      updatedPatterns.push(pattern);
    }

    const updatedSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { patterns: updatedPatterns }
    });

    res.json({
      message: "Pattern added successfully",
      patterns: updatedSettings.patterns
    });
  } catch (error) {
    console.error("Error adding pattern:", error);
    res.status(500).json({ error: "Failed to add pattern" });
  }
});

app.post('/settings/patterns/edit', authenticate, async (req, res) => {
  const { oldPattern, newPattern } = req.body;
  if (!oldPattern || !newPattern) {
    return res.status(400).json({ error: "Missing oldPattern or newPattern." });
  }

  try {
    const userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
    });
    if (!userSettings) {
      return res.status(404).json({ error: "Settings not found." });
    }

    const currentPatterns = Array.isArray(userSettings.patterns)
      ? [...userSettings.patterns]
      : [];

    const index = currentPatterns.indexOf(oldPattern);
    if (index === -1) {
      return res.status(404).json({ error: "Pattern to edit not found." });
    }

    currentPatterns[index] = newPattern;

    const updatedSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { patterns: currentPatterns }
    });

    res.json({
      message: "Pattern updated successfully",
      patterns: updatedSettings.patterns
    });
  } catch (error) {
    console.error("Error editing pattern:", error);
    res.status(500).json({ error: "Failed to edit pattern" });
  }
});

app.post('/settings/patterns/delete', authenticate, async (req, res) => {
  const { pattern } = req.body;
  if (!pattern) {
    return res.status(400).json({ error: "Missing 'pattern' field." });
  }

  try {
    const userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
    });

    if (!userSettings) {
      return res.status(404).json({ error: "Settings not found." });
    }

    const currentPatterns = Array.isArray(userSettings.patterns)
      ? [...userSettings.patterns]
      : [];

    const updatedPatterns = currentPatterns.filter((pat) => pat !== pattern);

    const updatedSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { patterns: updatedPatterns }
    });

    res.json({
      message: "Pattern deleted successfully",
      patterns: updatedSettings.patterns
    });
  } catch (error) {
    console.error("Error deleting pattern:", error);
    res.status(500).json({ error: "Failed to delete pattern" });
  }
});




/************************************************************
 *  Advanced filter
 ************************************************************/
// GET /trades/advanced-search
// Query params:
//   ?startDate=YYYY-MM-DD
//   &endDate=YYYY-MM-DD
//   &instrument=...
//   &pattern=...
//   &direction=Long|Short
//   &session=London|US|Other
//   &page=1
//   &size=20
app.get('/trades/advanced-search', authenticate, async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        instrument,
        pattern,
        direction,
        session,
        page = '1',
        size = '20'
      } = req.query;
  
      const pageNum = parseInt(page.toString(), 10) || 1;
      const sizeNum = parseInt(size.toString(), 10) || 20;
  
      // We'll build up a `where` object for Prisma with AND-based logic.
      // The user MUST match userId, and dateTime in range if provided,
      // instrument if provided, etc.
  
      const whereClause = {
        userId: req.user.userId
      };
  
      // Date range filter (AND logic)
      if (startDate && endDate) {
        whereClause.dateTime = {
          gte: new Date(startDate.toString()),
          lte: new Date(endDate.toString()),
        };
      } else if (startDate) {
        whereClause.dateTime = { gte: new Date(startDate.toString()) };
      } else if (endDate) {
        whereClause.dateTime = { lte: new Date(endDate.toString()) };
      }
  
      // Instrument filter (exact match)
      if (instrument) {
        whereClause.instrument = instrument.toString();
      }
  
      // Pattern filter (exact match)
      if (pattern) {
        whereClause.pattern = pattern.toString();
      }
  
      // Direction filter
      if (direction && (direction === 'Long' || direction === 'Short')) {
        whereClause.direction = direction.toString();
      }
  
      // Session filter (if applicable)
      if (session && ["London", "US", "Other"].includes(session.toString())) {
        whereClause.session = session.toString();
      }
  
      // Pagination: skip & take
      const skip = (pageNum - 1) * sizeNum;
      const take = sizeNum;
  
      // Fetch trades
      const trades = await prisma.trade.findMany({
        where: whereClause,
        orderBy: { dateTime: 'asc' },
        skip,
        take
      });
  
      // Count total records matching the filters
      const total = await prisma.trade.count({
        where: whereClause
      });
  
      // Return trades + pagination info
      res.json({
        trades,
        total,
        page: pageNum,
        size: sizeNum,
        totalPages: Math.ceil(total / sizeNum)
      });
    } catch (error) {
      console.error("Error in advanced search (AND logic):", error);
      res.status(500).json({ error: "Failed to perform advanced search" });
    }
  });
  
  
  

/************************************************************
 *  START THE SERVER
 ************************************************************/
app.listen(PORT, () => {
  console.log(`WealthLog API running on port ${PORT}`);
});
