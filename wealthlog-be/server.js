// Backend: Express.js + PostgreSQL + Prisma

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = 5000;
const SECRET_KEY = process.env.SECRET_KEY;

app.use(cors());
app.use(express.json());

// User Authentication - Register
app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const user = await prisma.user.create({
            data: { username, password: hashedPassword, role, accountBalance: 0 }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'User already exists' });
    }
});

// User Authentication - Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
});

// Middleware for Authentication
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Add Trade with Auto-Detected Session and Account Balance Update
app.post('/trades', authenticate, async (req, res) => {
    const { instrument, percentage, amount, fees, dateTime, pattern } = req.body;
    const tradeTime = new Date(dateTime || Date.now());
    let session = "Other";
    const hour = tradeTime.getHours();

    if (hour >= 10 && hour <= 12) {
        session = "London";
    } else if (hour >= 16 && hour <= 19) {
        session = "US";
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        let newBalance = user.accountBalance;

        if (percentage !== undefined && percentage !== 0) {
            newBalance *= (1 + percentage / 100);
        } else {
            newBalance += amount;
        }
        newBalance -= fees;

        const trade = await prisma.trade.create({
            data: { instrument, session, percentage, amount, fees, dateTime: tradeTime, pattern, userId: req.user.userId }
        });

        await prisma.user.update({
            where: { id: req.user.userId },
            data: { accountBalance: newBalance }
        });

        res.json(trade);
    } catch (error) {
        res.status(500).json({ error: "Failed to add trade" });
    }
});

// Get Account Balance
app.get('/account', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { accountBalance: true } });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch account balance" });
    }
});

// Update Account Balance (Add Money to Account)
app.post('/account/add', authenticate, async (req, res) => {
    const { amount } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        const newBalance = user.accountBalance + amount;

        await prisma.user.update({
            where: { id: req.user.userId },
            data: { accountBalance: newBalance }
        });

        res.json({ message: "Balance updated successfully", newBalance });
    } catch (error) {
        res.status(500).json({ error: "Failed to update balance" });
    }
});

// Get User Settings (Instruments, Patterns, BE Range)
app.get('/settings', authenticate, async (req, res) => {
    try {
        let settings = await prisma.settings.findUnique({
            where: { userId: req.user.userId }
        });

        if (!settings) {
            settings = await prisma.settings.create({
                data: { userId: req.user.userId, instruments: [], patterns: [] }
            });
        }

        res.json({
            instruments: settings.instruments || [],
            patterns: settings.patterns || [],
            beMin: settings.beMin,
            beMax: settings.beMax
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch settings" });
    }
});

// Update Instruments, Patterns & BE Range
app.post('/settings/update', authenticate, async (req, res) => {
    const { instruments, patterns, beMin, beMax } = req.body;
    try {
        const updatedSettings = await prisma.settings.upsert({
            where: { userId: req.user.userId },
            update: { instruments, patterns, beMin, beMax },
            create: { userId: req.user.userId, instruments, patterns, beMin, beMax }
        });

        res.json(updatedSettings);
    } catch (error) {
        res.status(500).json({ error: "Failed to update settings" });
    }
});


// Get Trades with Filtering
app.get('/trades', authenticate, async (req, res) => {
    try {
        const trades = await prisma.trade.findMany({
            where: { userId: req.user.userId }, // Fetch only logged-in user's trades
            orderBy: { dateTime: 'desc' } // Sort trades by latest date first
        });

        res.json(trades);
    } catch (error) {
        console.error("Error fetching trades:", error);
        res.status(500).json({ error: "Failed to fetch trades" });
    }
});


app.listen(PORT, () => console.log(`WealthLog API running on port ${PORT}`));
