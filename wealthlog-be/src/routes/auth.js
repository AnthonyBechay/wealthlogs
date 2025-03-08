// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY;

// 1 hour in milliseconds
const COOKIE_EXPIRATION_MS = 60 * 60 * 1000;

// REGISTER
router.post('/register', async (req, res) => {
  console.log("[REGISTER] Received register request.");
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
    console.log(`[REGISTER] Attempting to create user: ${username}, role: ${roleName}`);

    const finalRoleName = roleName || 'MEMBER';
    let foundRole = await prisma.role.findUnique({
      where: { name: finalRoleName }
    });
    if (!foundRole) {
      foundRole = await prisma.role.create({ data: { name: finalRoleName } });
      console.log(`[REGISTER] Created new role: ${finalRoleName}`);
    }

    let dob = null;
    if (dateOfBirth) {
      dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        console.warn("[REGISTER] Invalid dateOfBirth:", dateOfBirth);
        return res.status(400).json({ error: "Invalid dateOfBirth format" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
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
    console.log(`[REGISTER] User created with ID: ${newUser.id}`);

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
  console.log("[LOGIN] Received login request.");

  const { username, password } = req.body;
  console.log(`[LOGIN] Username attempt: ${username}`);

  try {
    console.log("[LOGIN] Searching for user in database...");
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      console.warn(`[LOGIN] No user found with username: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log(`[LOGIN] Found user with ID: ${user.id}. Checking password...`);

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.warn("[LOGIN] Password mismatch for user:", username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log("[LOGIN] Password matched. Generating JWT...");
    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
    console.log(`[LOGIN] JWT generated for userId: ${user.id}`);

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieConfig = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: COOKIE_EXPIRATION_MS
    };
    console.log("[LOGIN] Setting cookie with config:", cookieConfig);

    res.cookie('token', token, cookieConfig);
    console.log("[LOGIN] Cookie set. Returning user info.");
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        // Possibly also other fields
      }
    });
  } catch (error) {
    console.error("[LOGIN] Error during login:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// LOGOUT
// Here we skip JSON body parsing by using express.raw() for this route only:
router.post(
  '/logout',
  express.raw({ type: '*/*' }), 
  (req, res) => {
    console.log("[LOGOUT] Received logout request.");

    const token = req.cookies.token;
    if (!token) {
      console.log("[LOGOUT] No token cookie found. Possibly already logged out.");
    } else {
      console.log("[LOGOUT] Found token cookie. Clearing now.");
    }

    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax'
    });

    console.log("[LOGOUT] Cookie cleared. Sending 200.");
    return res.status(200).json({ message: 'Logged out successfully' });
  }
);

// /ME
router.get('/me', (req, res) => {
  console.log("[ME] Checking login status.");

  try {
    const token = req.cookies.token;
    if (!token) {
      console.log("[ME] No token in cookies => 401 Not logged in.");
      return res.status(401).json({ error: 'Not logged in' });
    }
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log(`[ME] Logged in as userId: ${decoded.userId}`);
    return res.json({ userId: decoded.userId });
  } catch (error) {
    console.log("[ME] Invalid or expired token => 401.");
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
