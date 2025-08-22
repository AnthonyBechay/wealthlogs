const express = require('express');
const router = express.Router();
const { prisma } = require('../../lib/prisma');
const { authenticate } = require('../../middleware/auth.middleware');

/* helper returns arrays */
async function getData(userId) {
  const [inst, patt, set] = await Promise.all([
    prisma.financialInstrument.findMany({ where: { userId } }),
    prisma.tradingPattern.findMany({ where: { userId } }),
    prisma.settings.findUnique({ where: { userId } }),
  ]);
  return {
    instruments: inst.map((i) => i.name),
    patterns: patt.map((p) => p.name),
    beMin: set?.beMin ?? -0.2,
    beMax: set?.beMax ?? 0.3,
  };
}

/* GET /trading-settings */
router.get('/', authenticate, async (req, res) => {
  try { res.json(await getData(req.user.userId)); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

/* Instruments */
router.post('/instruments/add', authenticate, async (req, res) => {
  const { name } = req.body; if (!name) return res.status(400).json({ error: 'Missing name' });
  try { await prisma.financialInstrument.upsert({ where: { userId_name: { userId: req.user.userId, name } }, update: {}, create: { userId: req.user.userId, name } }); res.json(await getData(req.user.userId)); }
  catch (e) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/instruments/delete', authenticate, async (req, res) => {
  const { name } = req.body; try { await prisma.financialInstrument.delete({ where: { userId_name: { userId: req.user.userId, name } } }); res.json(await getData(req.user.userId)); } catch { res.status(500).json({ error: 'Failed' }); }
});

/* Patterns */
router.post('/patterns/add', authenticate, async (req, res) => {
  const { name } = req.body; if (!name) return res.status(400).json({ error: 'Missing name' });
  try { await prisma.tradingPattern.upsert({ where: { userId_name: { userId: req.user.userId, name } }, update: {}, create: { userId: req.user.userId, name } }); res.json(await getData(req.user.userId)); }
  catch { res.status(500).json({ error: 'Failed' }); }
});
router.post('/patterns/delete', authenticate, async (req, res) => {
  const { name } = req.body; try { await prisma.tradingPattern.delete({ where: { userId_name: { userId: req.user.userId, name } } }); res.json(await getData(req.user.userId)); } catch { res.status(500).json({ error: 'Failed' }); }
});

/* BE range (still in settings) */
router.post('/beRange/update', authenticate, async (req, res) => {
  const { beMin, beMax } = req.body;
  const min = parseFloat(beMin); const max = parseFloat(beMax);
  if (isNaN(min) || isNaN(max) || min >= max) return res.status(400).json({ error: 'Invalid' });
  try { await prisma.settings.update({ where: { userId: req.user.userId }, data: { beMin: min, beMax: max } }); res.json(await getData(req.user.userId)); }
  catch { res.status(500).json({ error: 'Failed' }); }
});



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
