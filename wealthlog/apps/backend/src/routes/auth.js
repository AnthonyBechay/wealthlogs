const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || "some-very-secret-key";
const TOKEN_EXPIRATION = "1h"; // example: 1 hour

// REGISTER
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
      roleName
    } = req.body;

    // Check if role exists (or create if not)
    const finalRoleName = roleName || 'MEMBER';
    let foundRole = await prisma.role.findUnique({
      where: { name: finalRoleName }
    });
    if (!foundRole) {
      foundRole = await prisma.role.create({ data: { name: finalRoleName } });
    }

    let dob = null;
    if (dateOfBirth) {
      dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json({ error: "Invalid dateOfBirth format" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
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
        roles: { connect: { id: foundRole.id } }
      },
      include: { roles: true }
    });

    return res.json({
      message: "User registered successfully",
      userId: newUser.id,
      roles: newUser.roles.map(r => r.name)
    });
  } catch (error) {
    console.error("[REGISTER] Error:", error);
    if (error.code === 'P2002') {
      // Unique constraint => username/email in use
      return res.status(409).json({
        error: "Username or email already in use"
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { username }
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, SECRET_KEY, {
      expiresIn: TOKEN_EXPIRATION
    });

    // Return token + some user info in JSON
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        // add other fields if you want
      }
    });
  } catch (error) {
    console.error("[LOGIN] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// LOGOUT
// With bearer tokens, we typically "logout" client-side by deleting the token from localStorage.
// You could also manage a token blacklist on the server if needed.
router.post('/logout', (req, res) => {
  // In a pure stateless JWT approach, there's no server cookie to clear
  // We might do a token blacklist here, but let's keep it simple:
  return res.json({ message: 'Logged out successfully (client must discard token)' });
});

// /ME endpoint (test to see if user is logged in)
router.get('/me', (req, res) => {
  // We'll rely on the authenticate middleware or parse the header ourselves
  // see below for an updated "authenticate" that checks the Authorization header
  return res.json({ message: 'This route requires Auth. If you see this, you are authenticated.' });
});

module.exports = router;
