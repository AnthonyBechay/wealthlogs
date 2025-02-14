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
 *  AUTHENTICATION ROUTES
 ************************************************************/

/**
 * REGISTER a new user.
 * This route creates a new user in the database with a hashed password.
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
 * Validates credentials, returns a signed JWT token on success.
 * Body params: username, password
 */
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
        where: { username },
    });

    // Check if user exists and password is correct
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

/**
 * AUTHENTICATE incoming requests.
 * Expects the Authorization header: "Bearer <token>".
 * Attaches the decoded JWT payload to req.user.
 */
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Extract the actual token after "Bearer"
        const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

/************************************************************
 *  TRADE ROUTES
 ************************************************************/

/**
 * ADD a new trade record.
 * Auto-detects the session (London, US, or Other) based on time.
 * Updates the user's account balance automatically.
 * Body params: instrument, percentage, amount, fees, dateTime, pattern, direction
 */
app.post('/trades', authenticate, async (req, res) => {
    const { instrument, percentage, amount, fees, dateTime, pattern, direction } = req.body;
    const tradeTime = new Date(dateTime || Date.now());
    let session = "Other";

    // Detect session based on hour
    const hour = tradeTime.getHours();
    if (hour >= 10 && hour <= 12) {
        session = "London";
    } else if (hour >= 16 && hour <= 19) {
        session = "US";
    }

    try {
        // Fetch the user
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });
        if (!user) {
            console.error("User not found in database.");
            return res.status(404).json({ error: "User not found" });
        }

        // Calculate new account balance
        let newBalance = user.accountBalance;
        if (percentage !== undefined && percentage !== 0) {
            newBalance *= (1 + percentage / 100);
        } else {
            newBalance += amount;
        }
        newBalance -= fees;

        // Create the trade record
        const trade = await prisma.trade.create({
            data: {
                instrument,
                session,
                percentage,
                amount,
                fees,
                dateTime: tradeTime,
                pattern,
                direction,
                userId: req.user.userId
            }
        });

        // Update the user's account balance
        await prisma.user.update({
            where: { id: req.user.userId },
            data: { accountBalance: newBalance }
        });

        res.json(trade);
    } catch (error) {
        console.error("Error adding trade:", error);
        res.status(500).json({ error: "Failed to add trade", details: error.message });
    }
});

/**
 * GET all trades for the authenticated user, ordered by date descending.
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
 * EDIT a specific trade (by trade ID).
 * Recalculates the user's entire balance after editing the trade.
 */
app.put('/trades/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { instrument, percentage, amount, fees, dateTime, pattern, direction } = req.body;

    try {
        // Update the trade
        const updatedTrade = await prisma.trade.update({
            where: { id: parseInt(id) },
            data: { instrument, percentage, amount, fees, dateTime, pattern, direction }
        });

        // Fetch user and recalculate balance from scratch based on all trades
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        let newBalance = 0; // Start from 0

        // Get all trades in chronological order to re-apply changes
        const trades = await prisma.trade.findMany({
            where: { userId: req.user.userId },
            orderBy: { dateTime: "asc" }
        });

        // Apply fees and changes in the correct order
        for (const trade of trades) {
            newBalance -= trade.fees;
            if (trade.percentage !== undefined && trade.percentage !== 0) {
                newBalance *= (1 + trade.percentage / 100);
            } else {
                newBalance += trade.amount;
            }
        }

        // Update user balance
        await prisma.user.update({
            where: { id: req.user.userId },
            data: { accountBalance: newBalance }
        });

        res.json(updatedTrade);
    } catch (error) {
        res.status(500).json({ error: "Failed to update trade" });
    }
});

/**
 * DELETE a specific trade (by trade ID).
 * Recalculates the user's entire balance after deleting the trade.
 */
app.delete('/trades/:id', authenticate, async (req, res) => {
    const { id } = req.params;

    try {
        // Find the trade
        const trade = await prisma.trade.findUnique({
            where: { id: parseInt(id) }
        });

        if (!trade) {
            return res.status(404).json({ error: "Trade not found" });
        }

        // Delete the trade
        await prisma.trade.delete({ where: { id: parseInt(id) } });

        // Recalculate balance from scratch
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        let newBalance = 0;

        // Get remaining trades in chronological order
        const trades = await prisma.trade.findMany({
            where: { userId: req.user.userId },
            orderBy: { dateTime: "asc" }
        });

        // Apply fees and changes in the correct order
        for (const trade of trades) {
            newBalance -= trade.fees;
            if (trade.percentage !== undefined && trade.percentage !== 0) {
                newBalance *= (1 + trade.percentage / 100);
            } else {
                newBalance += trade.amount;
            }
        }

        // Update user balance
        await prisma.user.update({
            where: { id: req.user.userId },
            data: { accountBalance: newBalance }
        });

        res.json({ message: "Trade deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete trade" });
    }
});

/************************************************************
 *  ACCOUNT ROUTES
 ************************************************************/

/**
 * GET the current user's account balance.
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

// /**
//  * ADD a certain amount to the current user's account balance.
//  * Body param: amount
//  */
// app.post('/account/add', authenticate, async (req, res) => {
//     const { amount } = req.body;

//     try {
//         const user = await prisma.user.findUnique({
//             where: { id: req.user.userId }
//         });
//         const newBalance = user.accountBalance + amount;

//         await prisma.user.update({
//             where: { id: req.user.userId },
//             data: { accountBalance: newBalance }
//         });

//         res.json({ message: "Balance updated successfully", newBalance });
//     } catch (error) {
//         res.status(500).json({ error: "Failed to update balance" });
//     }
// });

/************************************************************
 *  SETTINGS ROUTES
 ************************************************************/

/**
 * GET user settings:
 * instruments, patterns, and Break-Even range (beMin, beMax).
 * Getting these setting for patterns and instruments list of values filling
 */


app.get('/settings', authenticate, async (req, res) => {
    try {
        let settings = await prisma.settings.findUnique({
            where: { userId: req.user.userId }
        });

        // If no settings found, create default
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
 * UPDATE user settings:
 * instruments, patterns, and Break-Even range (beMin, beMax).
 * Body params: instruments, patterns, beMin, beMax
 */
// POST /settings/beRange/update
// POST /settings/beRange/update
app.post('/settings/beRange/update', authenticate, async (req, res) => {
    const { beMin, beMax } = req.body;
  
    // 1) Double-check on server
    if (beMin >= beMax) {
      return res.status(400).json({ error: "beMin must be less than beMax" });
    }
  
    try {
      let userSettings = await prisma.settings.findUnique({
        where: { userId: req.user.userId },
      });
  
      // If none exists, create a default
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
        // Update ONLY beMin and beMax
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
 *  Transactions
 ************************************************************/



// Create Transaction (Deposit/Withdraw)
app.post('/account/transaction', authenticate, async (req, res) => {
    const { amount, type, dateTime, currency } = req.body;
    try {
        // Insert a new Transaction record
        const transaction = await prisma.transaction.create({
            data: {
                userId: req.user.userId,
                amount: amount,
                type: type,   // 'deposit' or 'withdraw'
                dateTime: dateTime ? new Date(dateTime) : new Date(),
                currency: currency || "USD"
            }
        });

        // Update user accountBalance
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });
        let newBalance = user.accountBalance;
        if (type === 'deposit') {
            newBalance += amount;
        } else if (type === 'withdraw') {
            newBalance -= amount;
        }

        await prisma.user.update({
            where: { id: req.user.userId },
            data: { accountBalance: newBalance }
        });

        res.json({ message: "Transaction successful", transaction });
    } catch (error) {
        console.error("Failed to process transaction:", error);
        res.status(500).json({ error: "Failed to process transaction" });
    }
});

// Get Transaction History
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
 *  Intruments
 ************************************************************/



// POST /settings/instruments/add
// Body: { instrument: string }
app.post('/settings/instruments/add', authenticate, async (req, res) => {
    const { instrument } = req.body;
  
    // Basic validation
    if (!instrument || typeof instrument !== 'string') {
      return res.status(400).json({ error: "Invalid or missing 'instrument' field." });
    }
  
    try {
      // Find user settings or create default
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
  
      // Add new instrument if it's not already in the list (optional check)
      if (!updatedInstruments.includes(instrument)) {
        updatedInstruments.push(instrument);
      }
  
      // Update settings in DB
      const updatedSettings = await prisma.settings.update({
        where: { userId: req.user.userId },
        data: { instruments: updatedInstruments }
      });
  
      // Return the entire updated list (or the updated Settings)
      res.json({
        message: "Instrument added successfully",
        instruments: updatedSettings.instruments
      });
    } catch (error) {
      console.error("Error adding instrument:", error);
      res.status(500).json({ error: "Failed to add instrument" });
    }
  });
  

// POST /settings/instruments/edit
// Body: { oldInstrument: string, newInstrument: string }
app.post('/settings/instruments/edit', authenticate, async (req, res) => {
    const { oldInstrument, newInstrument } = req.body;
  
    if (!oldInstrument || !newInstrument) {
      return res.status(400).json({ error: "Missing oldInstrument or newInstrument." });
    }
  
    try {
      let userSettings = await prisma.settings.findUnique({
        where: { userId: req.user.userId }
      });
      if (!userSettings) {
        return res.status(404).json({ error: "Settings not found. Please create them first." });
      }
  
      const currentInstruments = Array.isArray(userSettings.instruments)
        ? [...userSettings.instruments]
        : [];
  
      // Find the old instrument in array
      const index = currentInstruments.indexOf(oldInstrument);
      if (index === -1) {
        return res.status(404).json({ error: "Instrument to edit not found." });
      }
  
      // Replace with new instrument
      currentInstruments[index] = newInstrument;
  
      // Save updated array
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
  
// POST /settings/instruments/delete
// Body: { instrument: string }
app.post('/settings/instruments/delete', authenticate, async (req, res) => {
    const { instrument } = req.body;
  
    if (!instrument) {
      return res.status(400).json({ error: "Missing 'instrument' field." });
    }
  
    try {
      let userSettings = await prisma.settings.findUnique({
        where: { userId: req.user.userId }
      });
      if (!userSettings) {
        return res.status(404).json({ error: "Settings not found. Please create them first." });
      }
  
      const currentInstruments = Array.isArray(userSettings.instruments)
        ? [...userSettings.instruments]
        : [];
  
      // Filter out the instrument to delete
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
 *  Patterns
 ************************************************************/

// POST /settings/patterns/add
// Body: { pattern: string }
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
  
      // Add new pattern if not already present (optional check)
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

  

  // POST /settings/patterns/edit
// Body: { oldPattern: string, newPattern: string }
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
        return res.status(404).json({ error: "Settings not found. Please create them first." });
      }
  
      const currentPatterns = Array.isArray(userSettings.patterns)
        ? [...userSettings.patterns]
        : [];
  
      // Locate oldPattern in array
      const index = currentPatterns.indexOf(oldPattern);
      if (index === -1) {
        return res.status(404).json({ error: "Pattern to edit not found." });
      }
  
      // Replace with newPattern
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
  


// POST /settings/patterns/delete
// Body: { pattern: string }
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
        return res.status(404).json({ error: "Settings not found. Please create them first." });
      }
  
      const currentPatterns = Array.isArray(userSettings.patterns)
        ? [...userSettings.patterns]
        : [];
  
      // Remove the specified pattern
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
 *  START THE SERVER
 ************************************************************/
app.listen(PORT, () => console.log(`WealthLog API running on port ${PORT}`));
