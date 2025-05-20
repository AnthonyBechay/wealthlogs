// apps/backend/src/routes/auth.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailservice');

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

    // Générer un token de vérification d'email
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

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
        roles: { connect: { id: foundRole.id } },
        // Ajouter les champs de vérification d'email
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires
      },
      include: { roles: true }
    });

    // Envoyer l'email de vérification
    try {
      await emailService.sendVerificationEmail(
        email,
        username || firstName,
        emailVerificationToken
      );
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      // Ne pas faire échouer l'inscription si l'email échoue en mode développement
      if (process.env.NODE_ENV !== 'development') {
        // En production, on pourrait vouloir supprimer l'utilisateur créé si l'email échoue
        // await prisma.user.delete({ where: { id: newUser.id } });
        // return res.status(500).json({ error: "Failed to send verification email" });
      }
    }

    return res.json({
      message: "User registered successfully. Please check your email to verify your account.",
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
      where: { username },
      include: { roles: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Vérifier si l'email est vérifié (optionnel, selon votre logique métier)
    if (!user.emailVerified) {
      return res.status(403).json({ 
        error: 'Email not verified',
        message: 'Please verify your email before logging in.'
      });
    }

    // Mettre à jour la date de dernière connexion
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate JWT
    const token = jwt.sign({ 
      userId: user.id,
      roles: user.roles.map(r => r.name)
    }, SECRET_KEY, {
      expiresIn: TOKEN_EXPIRATION
    });

    // Return token + some user info in JSON
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map(r => r.name)
      }
    });
  } catch (error) {
    console.error("[LOGIN] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  // In a pure stateless JWT approach, there's no server cookie to clear
  // We might do a token blacklist here, but let's keep it simple:
  return res.json({ message: 'Logged out successfully (client must discard token)' });
});

// VERIFY EMAIL
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is missing'
      });
    }

    // Trouver l'utilisateur avec ce token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date() // Token non expiré
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }

    // Mettre à jour l'utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    // Envoyer un email de bienvenue
    try {
      await emailService.sendWelcomeEmail(
        user.email,
        user.username || user.firstName
      );
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Non critique, ne pas faire échouer la vérification
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during email verification'
    });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !emailService.isValidEmail(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email address' 
      });
    }

    // Normaliser l'email
    const normalizedEmail = emailService.normalizeEmail(email);

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // Pour des raisons de sécurité, ne pas révéler si l'email existe ou non
      return res.status(200).json({ 
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Définir l'expiration du token (1 heure)
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    // Enregistrer le token dans la base de données
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    // Envoyer l'email de réinitialisation
    await emailService.sendPasswordResetEmail(
      user.email,
      user.username || user.firstName,
      resetToken
    );

    // Répondre avec succès
    return res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully'
    });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'An error occurred while sending the password reset email'
    });
  }
});

// VERIFY RESET TOKEN
router.get('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is missing'
      });
    }

    // Rechercher l'utilisateur avec ce token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date() // Token non expiré
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Token valide
    return res.status(200).json({
      success: true,
      message: 'Token is valid'
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'An error occurred while verifying the token'
    });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token or password is missing'
      });
    }

    // Vérifier la longueur minimale du mot de passe
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Rechercher l'utilisateur avec ce token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date() // Token non expiré
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Mettre à jour le mot de passe et supprimer le token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'An error occurred while resetting the password'
    });
  }
});

// RESEND VERIFICATION EMAIL
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !emailService.isValidEmail(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email address' 
      });
    }

    // Normaliser l'email
    const normalizedEmail = emailService.normalizeEmail(email);

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // Pour des raisons de sécurité, ne pas révéler si l'email existe ou non
      return res.status(200).json({ 
        success: true,
        message: 'If an account exists with this email, a verification email has been sent.'
      });
    }

    // Vérifier si l'email est déjà vérifié
    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'This email is already verified.'
      });
    }

    // Générer un nouveau token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    // Mettre à jour l'utilisateur avec le nouveau token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpires
      }
    });

    // Envoyer l'email de vérification
    await emailService.sendVerificationEmail(
      user.email,
      user.username || user.firstName,
      emailVerificationToken
    );

    // Répondre avec succès
    return res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });
    
  } catch (error) {
    console.error('Resend verification email error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'An error occurred while sending the verification email'
    });
  }
});
// /ME endpoint (test to see if user is logged in)
router.get('/me', (req, res) => {
  return res.json({ message: 'This route requires Auth. If you see this, you are authenticated.' });
});

module.exports = router;
