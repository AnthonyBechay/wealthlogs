// src/routes/admin.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /admin/roles
 * Returns the entire list of roles from the DB for use in dropdowns.
 */
router.get('/roles', async (req, res) => {
  try {
    const allRoles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(allRoles);
  } catch (error) {
    console.error("Error fetching all roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

/**
 * POST /admin/users/:userId/addRole
 * Body: { roleName }
 * Connects the given role to the user. If the role doesn't exist, it is created.
 */
router.post('/users/:userId/addRole', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { roleName } = req.body;
    if (!roleName) {
      return res.status(400).json({ error: "roleName is required" });
    }

    // 1) Find or create the role
    let foundRole = await prisma.role.findUnique({
      where: { name: roleName }
    });
    if (!foundRole) {
      foundRole = await prisma.role.create({ data: { name: roleName } });
    }

    // 2) Attach the role to the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          connect: { id: foundRole.id }
        }
      },
      include: { roles: true }
    });

    res.json({
      message: `Role "${roleName}" attached to user #${userId}`,
      userRoles: updatedUser.roles.map(r => r.name)
    });
  } catch (error) {
    console.error("Attach role error:", error);
    if (error.code === 'P2025') {
      // user not found
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
