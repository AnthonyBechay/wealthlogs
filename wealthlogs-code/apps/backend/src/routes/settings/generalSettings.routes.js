// apps/backend/src/routes/settings/settings.routes.js
const express = require("express");
const router = express.Router();
const { prisma } = require('../../lib/prisma');

const { authenticate } = require("../../middleware/auth.middleware");

/**
 * GET /settings
 * Fetch the user’s entire Settings record (creating defaults if none exist).
 */

/* GET /generalSettings  ─ fetch or create row */
router.get('/', authenticate, async (req, res) => {
  try {
    let row = await prisma.settings.findUnique({
      where: { userId: req.user.userId },
    });

    if (!row) {
      row = await prisma.settings.create({
        data: {
          userId: req.user.userId,
          beMin: -0.2,
          beMax: 0.3,
          preferredCurrency: 'USD',
          language: 'en',
          timezone: 'UTC',
          displayMode: 'light',
          notificationPreferences: {},
          mediaTags: [],            // keep mediaTags here
        },
      });
    }

    return res.json({
      beMin: row.beMin,
      beMax: row.beMax,
      preferredCurrency: row.preferredCurrency,
      language: row.language,
      timezone: row.timezone,
      displayMode: row.displayMode,
      mediaTags: row.mediaTags || [],
    });
  } catch (err) {
    console.error('GET /generalSettings error:', err);
    return res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

module.exports = router;
/* 
  =======================
   General Preferences
  =======================
*/

/**
 * POST /settings/displayMode
 * body: { displayMode: "light" | "dark" | "system" }
 */
router.post("/displayMode", authenticate, async (req, res) => {
  try {
    const { displayMode } = req.body;
    if (!["light", "dark", "system"].includes(displayMode)) {
      return res
        .status(400)
        .json({ error: "displayMode must be 'light', 'dark', or 'system'" });
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
 * body: { language: "en" | "ar" | "fr" }
 */
router.post("/language", authenticate, async (req, res) => {
  try {
    const { language } = req.body;
    if (!language || !["en", "ar", "fr"].includes(language)) {
      return res.status(400).json({ error: "language must be 'en', 'ar', or 'fr'" });
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
    // Optional: You could validate timezone against a known list
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
router.post('/currency', authenticate, async (req, res) => {
  try {
    const { preferredCurrency } = req.body;
    if (!['USD', 'EUR'].includes(preferredCurrency)) {
      return res.status(400).json({ error: 'preferredCurrency must be USD or EUR' });
    }
    const updated = await prisma.settings.update({
      where: { userId: req.user.userId },
      data: { preferredCurrency },
    });
    return res.json({ preferredCurrency: updated.preferredCurrency });
  } catch (error) {
    console.error('POST /settings/currency error:', error);
    res.status(500).json({ error: 'Failed to update preferred currency' });
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




module.exports = router;
