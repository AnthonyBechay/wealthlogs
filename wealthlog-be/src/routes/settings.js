// src/routes/settings.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { authenticate } = require("../middleware/authenticate");

// GET /settings
router.get("/", authenticate, async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({
      where: { userId: req.user.userId },
    });
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          userId: req.user.userId,
          instruments: [],
          patterns: [],
          beMin: -0.2,
          beMax: 0.3,
        },
      });
    }
    return res.json({
      instruments: settings.instruments || [],
      patterns: settings.patterns || [],
      beMin: settings.beMin,
      beMax: settings.beMax,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// ============== Instruments ==============
// POST /settings/instruments/add
router.post("/instruments/add", authenticate, async (req, res) => {
  try {
    const { instrument } = req.body;
    if (!instrument) {
      return res.status(400).json({ error: "Missing instrument" });
    }
    let userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId },
    });
    if (!userSettings) {
      userSettings = await prisma.settings.create({
        data: { userId: req.user.userId, instruments: [] }
      });
    }
    const updated = Array.isArray(userSettings.instruments)
      ? [...userSettings.instruments]
      : [];
    if (!updated.includes(instrument)) updated.push(instrument);
    const newSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { instruments: updated },
    });
    return res.json({
      message: "Instrument added",
      instruments: newSettings.instruments,
    });
  } catch (error) {
    console.error("Error adding instrument:", error);
    return res.status(500).json({ error: "Failed to add instrument" });
  }
});

// POST /settings/instruments/edit
router.post("/instruments/edit", authenticate, async (req, res) => {
  try {
    const { oldInstrument, newInstrument } = req.body;
    if (!oldInstrument || !newInstrument) {
      return res.status(400).json({ error: "Missing oldInstrument or newInstrument" });
    }
    const settings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
    });
    if (!settings) {
      return res.status(404).json({ error: "Settings not found" });
    }
    const current = Array.isArray(settings.instruments) ? [...settings.instruments] : [];
    const idx = current.indexOf(oldInstrument);
    if (idx === -1) {
      return res.status(404).json({ error: "Instrument not found" });
    }
    current[idx] = newInstrument;
    const updated = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { instruments: current },
    });
    return res.json({
      message: "Instrument updated",
      instruments: updated.instruments,
    });
  } catch (error) {
    console.error("Error editing instrument:", error);
    return res.status(500).json({ error: "Failed to edit instrument" });
  }
});

// POST /settings/instruments/delete
router.post("/instruments/delete", authenticate, async (req, res) => {
  try {
    const { instrument } = req.body;
    if (!instrument) {
      return res.status(400).json({ error: "Missing instrument" });
    }
    const settings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
    });
    if (!settings) {
      return res.status(404).json({ error: "Settings not found" });
    }
    const current = Array.isArray(settings.instruments) ? [...settings.instruments] : [];
    const updated = current.filter((i) => i !== instrument);
    const newSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { instruments: updated },
    });
    return res.json({
      message: "Instrument deleted",
      instruments: newSettings.instruments,
    });
  } catch (error) {
    console.error("Error deleting instrument:", error);
    return res.status(500).json({ error: "Failed to delete instrument" });
  }
});

// ============== Patterns ==============
// POST /settings/patterns/add
router.post("/patterns/add", authenticate, async (req, res) => {
  try {
    const { pattern } = req.body;
    if (!pattern) {
      return res.status(400).json({ error: "Missing pattern" });
    }
    let userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
    });
    if (!userSettings) {
      userSettings = await prisma.settings.create({
        data: { userId: req.user.userId, instruments: [], patterns: [] }
      });
    }
    const updated = Array.isArray(userSettings.patterns)
      ? [...userSettings.patterns]
      : [];
    if (!updated.includes(pattern)) updated.push(pattern);
    const newSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { patterns: updated },
    });
    return res.json({
      message: "Pattern added",
      patterns: newSettings.patterns,
    });
  } catch (error) {
    console.error("Error adding pattern:", error);
    return res.status(500).json({ error: "Failed to add pattern" });
  }
});

// POST /settings/patterns/edit
router.post("/patterns/edit", authenticate, async (req, res) => {
  try {
    const { oldPattern, newPattern } = req.body;
    if (!oldPattern || !newPattern) {
      return res.status(400).json({ error: "Missing oldPattern or newPattern" });
    }
    const userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
    });
    if (!userSettings) {
      return res.status(404).json({ error: "Settings not found" });
    }
    const current = Array.isArray(userSettings.patterns) ? [...userSettings.patterns] : [];
    const idx = current.indexOf(oldPattern);
    if (idx === -1) {
      return res.status(404).json({ error: "Pattern not found" });
    }
    current[idx] = newPattern;
    const updated = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { patterns: current },
    });
    return res.json({
      message: "Pattern updated",
      patterns: updated.patterns,
    });
  } catch (error) {
    console.error("Error editing pattern:", error);
    return res.status(500).json({ error: "Failed to edit pattern" });
  }
});

// POST /settings/patterns/delete
router.post("/patterns/delete", authenticate, async (req, res) => {
  try {
    const { pattern } = req.body;
    if (!pattern) {
      return res.status(400).json({ error: "Missing pattern" });
    }
    const userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
    });
    if (!userSettings) {
      return res.status(404).json({ error: "Settings not found" });
    }
    const current = Array.isArray(userSettings.patterns) ? [...userSettings.patterns] : [];
    const updated = current.filter(p => p !== pattern);
    const newSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { patterns: updated },
    });
    return res.json({
      message: "Pattern deleted",
      patterns: newSettings.patterns,
    });
  } catch (error) {
    console.error("Error deleting pattern:", error);
    return res.status(500).json({ error: "Failed to delete pattern" });
  }
});

// ============== BE Range ==============
// POST /settings/beRange/update
router.post("/beRange/update", authenticate, async (req, res) => {
  try {
    const { beMin, beMax } = req.body;
    if (beMin >= beMax) {
      return res.status(400).json({ error: "beMin must be less than beMax" });
    }
    let userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId }
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

module.exports = router;
