// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY;
const { getOrCreateCashAccountForUser } = require('../helpers/recalc');

// REGISTER


/**
 * POST /auth/register
 * Creates a user and assigns exactly one role. E.g. "MEMBER" by default,
 * or "ADMIN" if provided in the body.
 */
router.post('/register', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      securityQuestion,
      securityAnswer,
      roleName // e.g. "ADMIN" or "MEMBER"
    } = req.body;

    // If the front end doesn't specify a role, default to "MEMBER"
    const finalRoleName = roleName || 'MEMBER';

    // 1) find or create the role
    let foundRole = await prisma.role.findUnique({
      where: { name: finalRoleName }
    });
    if (!foundRole) {
      foundRole = await prisma.role.create({
        data: { name: finalRoleName }
      });
    }

    // 2) convert dateOfBirth if provided
    let dob = null;
    if (dateOfBirth) {
      dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json({ error: "Invalid dateOfBirth format" });
      }
    }

    // 3) hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4) create the user, connecting the single role
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        dateOfBirth: dob,
        securityQuestion,
        securityAnswer,
        roles: {
          connect: { id: foundRole.id } // attach the single role
        }
      },
      include: {
        roles: true // so we can see which role got connected
      }
    });

    res.json({
      message: "User registered successfully",
      userId: newUser.id,
      roles: newUser.roles.map(r => r.name)
    });
  } catch (error) {
    console.error("Register error:", error);
    if (error.code === 'P2002') {
      // Duplicate username or email
      return res.status(409).json({
        error: "Username or email already in use"
      });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});












// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});





module.exports = router;
