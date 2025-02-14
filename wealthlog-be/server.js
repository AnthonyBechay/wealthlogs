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
            data: { username, password: hashedPassword, role }
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

// Add Trade with Auto-Detected Session
app.post('/trades', authenticate, async (req, res) => {
    const { instrument, outcome, amount, dateTime, pattern } = req.body;
    
    const tradeTime = new Date(dateTime || Date.now());
    let session = "Other";
    const hour = tradeTime.getHours();

    if (hour >= 10 && hour <= 12) {
        session = "London";
    } else if (hour >= 16 && hour <= 19) {
        session = "US";
    }

    try {
        const trade = await prisma.trade.create({
            data: { 
                instrument, 
                session, 
                outcome, 
                amount, 
                dateTime: tradeTime, 
                pattern, 
                userId: req.user.userId 
            }
        });
        res.json(trade);
    } catch (error) {
        res.status(500).json({ error: "Failed to add trade" });
    }
});

// Edit Trade
app.put('/trades/:id', authenticate, async (req, res) => {
    const { instrument, outcome, amount, dateTime, pattern } = req.body;
    const tradeId = parseInt(req.params.id);

    const tradeTime = new Date(dateTime);
    let session = "Other";
    const hour = tradeTime.getHours();

    if (hour >= 10 && hour <= 12) {
        session = "London";
    } else if (hour >= 16 && hour <= 19) {
        session = "US";
    }

    try {
        const updatedTrade = await prisma.trade.update({
            where: { id: tradeId, userId: req.user.userId },
            data: { instrument, session, outcome, amount, dateTime: tradeTime, pattern }
        });
        res.json(updatedTrade);
    } catch (error) {
        res.status(500).json({ error: "Failed to update trade" });
    }
});

// Delete Trade
app.delete('/trades/:id', authenticate, async (req, res) => {
    const tradeId = parseInt(req.params.id);
    
    try {
        await prisma.trade.delete({
            where: { id: tradeId, userId: req.user.userId }
        });
        res.json({ message: "Trade deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete trade" });
    }
});

// Get Trades with Filtering
app.get('/trades', authenticate, async (req, res) => {
    const { instrument, session, outcome } = req.query;
    const filters = { where: {} };
    if (instrument) filters.where.instrument = instrument;
    if (session) filters.where.session = session;
    if (outcome) filters.where.outcome = outcome;
    
    const trades = await prisma.trade.findMany({ ...filters });
    res.json(trades);
});

app.listen(PORT, () => console.log(`WealthLog API running on port ${PORT}`));
