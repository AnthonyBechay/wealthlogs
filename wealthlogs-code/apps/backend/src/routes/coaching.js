// src/routes/coaching.js
const express = require("express");
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authenticate } = require("../middleware/authenticate");

// POST /coaching/assign
// Body: { coachUsername: string, accountIds: number[] }
router.post("/assign", authenticate, async (req, res) => {
  try {
    const { coachUsername, accountIds } = req.body;
    if (!coachUsername || !accountIds) {
      return res.status(400).json({ error: "coachUsername and accountIds are required" });
    }
    // Find the coach by username
    const coachUser = await prisma.user.findUnique({ where: { username: coachUsername } });
    if (!coachUser) {
      return res.status(404).json({ error: "Coach user not found" });
    }
    // For each account, upsert a coaching record (only if the account belongs to the requesting user)
    for (const acctId of accountIds) {
      const account = await prisma.financialAccount.findUnique({ where: { id: acctId } });
      if (!account || account.userId !== req.user.userId) {
        continue; // Skip accounts not owned by the user
      }
      await prisma.coaching.upsert({
        where: {
          coachId_studentId_accountId_module: {
            coachId: coachUser.id,
            studentId: req.user.userId,
            accountId: acctId,
            module: null,
          },
        },
        update: {},
        create: {
          coachId: coachUser.id,
          studentId: req.user.userId,
          accountId: acctId,
          module: null,
        },
      });
    }
    res.json({ message: "Assigned coaching successfully" });
  } catch (error) {
    console.error("Error assigning coach:", error);
    res.status(500).json({ error: "Failed to assign coach" });
  }
});

module.exports = router;
