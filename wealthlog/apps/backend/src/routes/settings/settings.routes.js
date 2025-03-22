// src/routes/settings/settings.routes.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { authenticate } = require("../../middleware/authenticate");

/**
 * GET /settings
 * Fetch the user’s entire Settings record (creating defaults if none exist).
 */
router.get("/", authenticate, async (req, res) => {
  try {
    let userSettings = await prisma.settings.findUnique({
      where: { userId: req.user.userId },
    });

    // If no settings row, create one with default values
    if (!userSettings) {
      userSettings = await prisma.settings.create({
        data: {
          userId: req.user.userId,
          instruments: [],
          patterns: [],
          beMin: -0.2,
          beMax: 0.3,
          preferredCurrency: "USD",
          language: "en",
          timezone: "UTC",
          displayMode: "light", // or "dark"
          notificationPreferences: {},
        },
      });
    }

    // Return everything. The front-end can pick what it needs
    return res.json({
      instruments: userSettings.instruments || [],
      patterns: userSettings.patterns || [],
      beMin: userSettings.beMin,
      beMax: userSettings.beMax,
      preferredCurrency: userSettings.preferredCurrency,
      language: userSettings.language,
      timezone: userSettings.timezone,
      displayMode: userSettings.displayMode,
      // or whatever else from the model
    });
  } catch (error) {
    console.error("GET /settings error:", error);
    return res.status(500).json({ error: "Failed to fetch user settings" });
  }
});

/* 
  =======================
   General Preferences
  =======================
*/

/**
 * POST /settings/displayMode
 * body: { displayMode: "light" | "dark" }
 */
router.post("/displayMode", authenticate, async (req, res) => {
  try {
    const { displayMode } = req.body;
    if (!["light", "dark"].includes(displayMode)) {
      return res
        .status(400)
        .json({ error: "displayMode must be 'light' or 'dark'" });
    }

    const updated = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { displayMode },
    });
    return res.json({ displayMode: updated.displayMode });
  } catch (error) {
    console.error("POST /settings/displayMode error:", error);
    res.status(500).json({ error: "Failed to update display mode" });
  }
});

/**
 * POST /settings/language
 * body: { language: string }
 */
router.post("/language", authenticate, async (req, res) => {
  try {
    const { language } = req.body;
    if (!language) {
      return res.status(400).json({ error: "Missing language" });
    }
    const updated = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { language },
    });
    return res.json({ language: updated.language });
  } catch (error) {
    console.error("POST /settings/language error:", error);
    res.status(500).json({ error: "Failed to update language" });
  }
});

/**
 * POST /settings/timezone
 * body: { timezone: string }
 */
router.post("/timezone", authenticate, async (req, res) => {
  try {
    const { timezone } = req.body;
    if (!timezone) {
      return res.status(400).json({ error: "Missing timezone" });
    }
    const updated = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { timezone },
    });
    return res.json({ timezone: updated.timezone });
  } catch (error) {
    console.error("POST /settings/timezone error:", error);
    res.status(500).json({ error: "Failed to update timezone" });
  }
});

/**
 * POST /settings/currency
 * body: { preferredCurrency: string }
 */
router.post("/currency", authenticate, async (req, res) => {
  try {
    const { preferredCurrency } = req.body;
    if (!preferredCurrency) {
      return res.status(400).json({ error: "Missing preferredCurrency" });
    }
    const updated = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { preferredCurrency },
    });
    return res.json({ preferredCurrency: updated.preferredCurrency });
  } catch (error) {
    console.error("POST /settings/currency error:", error);
    res.status(500).json({ error: "Failed to update preferred currency" });
  }
});

/* 
  =======================
     Instruments
  =======================
*/

/**
 * POST /settings/instruments/add
 * body: { instrument: string }
 */
router.post("/instruments/add", authenticate, async (req, res) => {
  try {
    const { instrument } = req.body;
    if (!instrument) {
      return res.status(400).json({ error: "Missing instrument" });
    }

    const userSettings = await getOrCreateUserSettings(req.user.userId);
    const updatedInstruments = Array.isArray(userSettings.instruments)
      ? [...userSettings.instruments]
      : [];

    // Only push if not existing
    if (!updatedInstruments.includes(instrument)) {
      updatedInstruments.push(instrument);
    }

    const newSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { instruments: updatedInstruments },
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

/**
 * POST /settings/instruments/edit
 * body: { oldInstrument, newInstrument }
 */
router.post("/instruments/edit", authenticate, async (req, res) => {
  try {
    const { oldInstrument, newInstrument } = req.body;
    if (!oldInstrument || !newInstrument) {
      return res
        .status(400)
        .json({ error: "Missing oldInstrument or newInstrument" });
    }

    const userSettings = await getOrCreateUserSettings(req.user.userId);
    const current = Array.isArray(userSettings.instruments)
      ? [...userSettings.instruments]
      : [];
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

/**
 * POST /settings/instruments/delete
 * body: { instrument }
 */
router.post("/instruments/delete", authenticate, async (req, res) => {
  try {
    const { instrument } = req.body;
    if (!instrument) {
      return res.status(400).json({ error: "Missing instrument" });
    }

    const userSettings = await getOrCreateUserSettings(req.user.userId);
    const current = Array.isArray(userSettings.instruments)
      ? [...userSettings.instruments]
      : [];
    const updatedInstruments = current.filter(i => i !== instrument);

    const newSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { instruments: updatedInstruments },
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

/* 
  =======================
      Patterns
  =======================
*/
router.post("/patterns/add", authenticate, async (req, res) => {
  try {
    const { pattern } = req.body;
    if (!pattern) {
      return res.status(400).json({ error: "Missing pattern" });
    }

    const userSettings = await getOrCreateUserSettings(req.user.userId);
    const updatedPatterns = Array.isArray(userSettings.patterns)
      ? [...userSettings.patterns]
      : [];

    if (!updatedPatterns.includes(pattern)) {
      updatedPatterns.push(pattern);
    }

    const newSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { patterns: updatedPatterns },
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

router.post("/patterns/edit", authenticate, async (req, res) => {
  try {
    const { oldPattern, newPattern } = req.body;
    if (!oldPattern || !newPattern) {
      return res
        .status(400)
        .json({ error: "Missing oldPattern or newPattern" });
    }

    const userSettings = await getOrCreateUserSettings(req.user.userId);
    const current = Array.isArray(userSettings.patterns)
      ? [...userSettings.patterns]
      : [];

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

router.post("/patterns/delete", authenticate, async (req, res) => {
  try {
    const { pattern } = req.body;
    if (!pattern) {
      return res.status(400).json({ error: "Missing pattern" });
    }

    const userSettings = await getOrCreateUserSettings(req.user.userId);
    const current = Array.isArray(userSettings.patterns)
      ? [...userSettings.patterns]
      : [];
    const updatedPatterns = current.filter(p => p !== pattern);

    const newSettings = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { patterns: updatedPatterns },
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

/* 
  =======================
     Break-Even Range
  =======================
*/
/**
 * POST /settings/beRange/update
 * body: { beMin, beMax }
 */
router.post("/beRange/update", authenticate, async (req, res) => {
  try {
    const { beMin, beMax } = req.body;
    if (typeof beMin === "undefined" || typeof beMax === "undefined") {
      return res.status(400).json({ error: "Missing beMin or beMax" });
    }
    const numericMin = parseFloat(beMin);
    const numericMax = parseFloat(beMax);
    if (isNaN(numericMin) || isNaN(numericMax) || numericMin >= numericMax) {
      return res.status(400).json({ error: "Invalid beMin/beMax" });
    }

    const updated = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { beMin: numericMin, beMax: numericMax },
    });
    return res.json({
      beMin: updated.beMin,
      beMax: updated.beMax,
    });
  } catch (error) {
    console.error("Error updating BE range:", error);
    return res.status(500).json({ error: "Failed to update beMin/beMax" });
  }
});

/* Helper to ensure we always have a Settings row for a user */
async function getOrCreateUserSettings(userId) {
  let userSettings = await prisma.settings.findUnique({
    where: { userId },
  });
  if (!userSettings) {
    userSettings = await prisma.settings.create({
      data: {
        userId,
        instruments: [],
        patterns: [],
        beMin: -0.2,
        beMax: 0.3,
        preferredCurrency: "USD",
        language: "en",
        timezone: "UTC",
        displayMode: "light",
        notificationPreferences: {},
      },
    });
  }
  return userSettings;
}

// In src/routes/settings/settings.routes.js

/**
 * POST /settings/mediaTags/add
 * body: { mediaTag: string }
 */
router.post("/mediaTags/add", authenticate, async (req, res) => {
  try {
    const { mediaTag } = req.body;
    if (!mediaTag) {
      return res.status(400).json({ error: "Missing mediaTag" });
    }
    // get or create userSettings
    const userSettings = await getOrCreateUserSettings(req.user.userId);
    const current = Array.isArray(userSettings.mediaTags)
      ? [...userSettings.mediaTags]
      : [];

    if (!current.includes(mediaTag)) {
      current.push(mediaTag);
    }

    const updated = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { mediaTags: current },
    });

    res.json({
      message: "Media tag added",
      mediaTags: updated.mediaTags || [],
    });
  } catch (error) {
    console.error("Error adding media tag:", error);
    res.status(500).json({ error: "Failed to add media tag" });
  }
});

/**
 * POST /settings/mediaTags/delete
 * body: { mediaTag: string }
 */
router.post("/mediaTags/delete", authenticate, async (req, res) => {
  try {
    const { mediaTag } = req.body;
    if (!mediaTag) {
      return res.status(400).json({ error: "Missing mediaTag" });
    }
    const userSettings = await getOrCreateUserSettings(req.user.userId);
    const current = Array.isArray(userSettings.mediaTags)
      ? [...userSettings.mediaTags]
      : [];

    const updatedList = current.filter((t) => t !== mediaTag);

    const updated = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { mediaTags: updatedList },
    });

    res.json({
      message: "Media tag removed",
      mediaTags: updated.mediaTags || [],
    });
  } catch (error) {
    console.error("Error removing media tag:", error);
    res.status(500).json({ error: "Failed to remove media tag" });
  }
});





module.exports = router;
