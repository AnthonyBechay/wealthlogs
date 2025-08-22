// src/routes/community.js
const express = require("express");
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authenticate } = require("../middleware/auth.middleware");

// GET /community - Get all communities
router.get("/", authenticate, async (req, res) => {
  try {
    const allCommunities = await prisma.community.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(allCommunities);
  } catch (error) {
    console.error("Error fetching all communities:", error);
    res.status(500).json({ error: "Failed to fetch communities" });
  }
});

// GET /community/my - Get communities the user belongs to
router.get("/my", authenticate, async (req, res) => {
  try {
    const memberships = await prisma.communityMembership.findMany({
      where: { userId: req.user.userId },
      include: { community: true },
    });
    const userCommunities = memberships.map(m => m.community);
    res.json(userCommunities);
  } catch (error) {
    console.error("Error fetching user communities:", error);
    res.status(500).json({ error: "Failed to fetch user communities" });
  }
});

// POST /community/create - Create a new community
router.post("/create", authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Community name is required" });
    }
    const community = await prisma.community.create({
      data: {
        name,
        description: "",
        type: "PRIVATE",
        memberships: {
          create: [
            {
              userId: req.user.userId,
              role: "COMMUNITY_MANAGER",
            },
          ],
        },
      },
      include: { memberships: true },
    });
    res.json({ message: "Community created", community });
  } catch (error) {
    console.error("Error creating community:", error);
    res.status(500).json({ error: "Failed to create community" });
  }
});

// POST /community/join - Join a community
router.post("/join", authenticate, async (req, res) => {
  try {
    const { communityId } = req.body;
    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }
    const existing = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: req.user.userId,
        },
      },
    });
    if (existing) {
      return res.status(400).json({ error: "You are already a member of this community." });
    }
    const membership = await prisma.communityMembership.create({
      data: {
        communityId,
        userId: req.user.userId,
        role: "MEMBER",
      },
    });
    res.json({ message: "Joined community", membership });
  } catch (error) {
    console.error("Error joining community:", error);
    res.status(500).json({ error: "Failed to join community" });
  }
});

// POST /community/leave - Leave a community
router.post("/leave", authenticate, async (req, res) => {
  try {
    const { communityId } = req.body;
    if (!communityId) {
      return res.status(400).json({ error: "communityId is required" });
    }
    await prisma.communityMembership.delete({
      where: {
        communityId_userId: {
          communityId,
          userId: req.user.userId,
        },
      },
    });
    res.json({ message: "Left community" });
  } catch (error) {
    console.error("Error leaving community:", error);
    res.status(500).json({ error: "Failed to leave community" });
  }
});

// GET /community/:id/members - Get members of a community
router.get("/:id/members", authenticate, async (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    const membership = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: req.user.userId,
        },
      },
    });
    if (!membership) {
      return res.status(403).json({ error: "Not in this community" });
    }
    const members = await prisma.communityMembership.findMany({
      where: { communityId },
      include: {
        user: { select: { username: true, id: true } },
      },
    });
    const result = members.map(m => ({
      userId: m.userId,
      username: m.user.username,
      role: m.role,
    }));
    res.json(result);
  } catch (error) {
    console.error("Error fetching community members:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// POST /community/assignCoach - Assign a coach to a community member
router.post("/assignCoach", authenticate, async (req, res) => {
  try {
    const { communityId, userId } = req.body;
    if (!communityId || !userId) {
      return res.status(400).json({ error: "communityId and userId required" });
    }
    const manager = await prisma.communityMembership.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: req.user.userId,
        },
      },
    });
    if (!manager || manager.role !== "COMMUNITY_MANAGER") {
      return res.status(403).json({ error: "Not authorized; must be a community manager" });
    }
    const updated = await prisma.communityMembership.update({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
      data: { role: "COMMUNITY_COACH" },
    });
    res.json({ message: "User assigned as coach", updated });
  } catch (error) {
    console.error("Error assigning coach:", error);
    res.status(500).json({ error: "Failed to assign coach" });
  }
});

module.exports = router;
