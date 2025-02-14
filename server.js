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

// Register User
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

// Login User
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

// Add Trade (FX Trade Management Module)
app.post('/trades', authenticate, async (req, res) => {
    const { instrument, session, outcome, amount } = req.body;
    const trade = await prisma.trade.create({
        data: { instrument, session, outcome, amount, userId: req.user.userId }
    });
    res.json(trade);
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
