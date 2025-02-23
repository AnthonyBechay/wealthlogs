// src/routes/settings.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { authenticate } = require("../middleware/authenticate");

// GET user settings
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
    res.json({
      instruments: settings.instruments || [],
      patterns: settings.patterns || [],
      beMin: settings.beMin,
      beMax: settings.beMax,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

/** ================ INSTRUMENTS ================ */

/**
 * POST /settings/instruments/add
 * Body: { instrument }
 */
router.post("/instruments/add", authenticate, async (req, res) => {
  try {
    const { instrument } = req.body;
    if (!instrument || typeof instrument !== "string") {
      return res.status(400).json({ error: "Invalid or missing 'instrument' field." });
    }

    // Find or create the settings row
    let userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId },
    });
    if (!userSettings) {
      userSettings = await prisma.settings.create({
        data: {
          userId: req.user.userId,
          instruments: [],
          patterns: [],
        },
      });
    }

    // Convert if not array
    const updatedInstruments = Array.isArray(userSettings.instruments)
      ? [...userSettings.instruments]
      : [];

    // Add if not duplicate
    if (!updatedInstruments.includes(instrument)) {
      updatedInstruments.push(instrument);
    }

    // Update
    const updatedSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { instruments: updatedInstruments },
    });

    res.json({
      message: "Instrument added successfully",
      instruments: updatedSettings.instruments,
    });
  } catch (error) {
    console.error("Error adding instrument:", error);
    res.status(500).json({ error: "Failed to add instrument" });
  }
});

/**
 * POST /settings/instruments/edit
 * Body: { oldInstrument, newInstrument }
 */
router.post("/instruments/edit", authenticate, async (req, res) => {
  try {
    const { oldInstrument, newInstrument } = req.body;
    if (!oldInstrument || !newInstrument) {
      return res.status(400).json({ error: "Missing oldInstrument or newInstrument." });
    }

    const userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId },
    });
    if (!userSettings) {
      return res.status(404).json({ error: "Settings not found." });
    }

    const currentInstruments = Array.isArray(userSettings.instruments)
      ? [...userSettings.instruments]
      : [];

    // find index of oldInstrument
    const index = currentInstruments.indexOf(oldInstrument);
    if (index === -1) {
      return res.status(404).json({ error: "Instrument to edit not found." });
    }

    currentInstruments[index] = newInstrument;

    const updatedSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { instruments: currentInstruments },
    });

    res.json({
      message: "Instrument updated successfully",
      instruments: updatedSettings.instruments,
    });
  } catch (error) {
    console.error("Error editing instrument:", error);
    res.status(500).json({ error: "Failed to edit instrument" });
  }
});

/**
 * POST /settings/instruments/delete
 * Body: { instrument }
 */
router.post("/instruments/delete", authenticate, async (req, res) => {
  try {
    const { instrument } = req.body;
    if (!instrument) {
      return res.status(400).json({ error: "Missing 'instrument' field." });
    }

    const userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId },
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
      data: { instruments: updatedInstruments },
    });

    res.json({
      message: "Instrument deleted successfully",
      instruments: updatedSettings.instruments,
    });
  } catch (error) {
    console.error("Error deleting instrument:", error);
    res.status(500).json({ error: "Failed to delete instrument" });
  }
});

/** ================ PATTERNS ================ */

/**
 * POST /settings/patterns/add
 * Body: { pattern }
 */
router.post("/patterns/add", authenticate, async (req, res) => {
  try {
    const { pattern } = req.body;
    if (!pattern || typeof pattern !== "string") {
      return res.status(400).json({ error: "Invalid or missing 'pattern' field." });
    }

    let userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId },
    });
    if (!userSettings) {
      userSettings = await prisma.settings.create({
        data: {
          userId: req.user.userId,
          instruments: [],
          patterns: [],
        },
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
      data: { patterns: updatedPatterns },
    });

    res.json({
      message: "Pattern added successfully",
      patterns: updatedSettings.patterns,
    });
  } catch (error) {
    console.error("Error adding pattern:", error);
    res.status(500).json({ error: "Failed to add pattern" });
  }
});

/**
 * POST /settings/patterns/edit
 * Body: { oldPattern, newPattern }
 */
router.post("/patterns/edit", authenticate, async (req, res) => {
  try {
    const { oldPattern, newPattern } = req.body;
    if (!oldPattern || !newPattern) {
      return res.status(400).json({ error: "Missing oldPattern or newPattern." });
    }

    const userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId },
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
      data: { patterns: currentPatterns },
    });

    res.json({
      message: "Pattern updated successfully",
      patterns: updatedSettings.patterns,
    });
  } catch (error) {
    console.error("Error editing pattern:", error);
    res.status(500).json({ error: "Failed to edit pattern" });
  }
});

/**
 * POST /settings/patterns/delete
 * Body: { pattern }
 */
router.post("/patterns/delete", authenticate, async (req, res) => {
  try {
    const { pattern } = req.body;
    if (!pattern) {
      return res.status(400).json({ error: "Missing 'pattern' field." });
    }

    const userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId },
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
      data: { patterns: updatedPatterns },
    });

    res.json({
      message: "Pattern deleted successfully",
      patterns: updatedSettings.patterns,
    });
  } catch (error) {
    console.error("Error deleting pattern:", error);
    res.status(500).json({ error: "Failed to delete pattern" });
  }
});

/** ================ BREAK-EVEN RANGE ================ */

/**
 * POST /settings/beRange/update
 * Body: { beMin, beMax }
 */
router.post("/beRange/update", authenticate, async (req, res) => {
  try {
    const { beMin, beMax } = req.body;
    if (beMin >= beMax) {
      return res.status(400).json({ error: "beMin must be less than beMax" });
    }

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

module.exports = router;
