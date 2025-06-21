// apps/backend/src/services/emailservice.js
const dotenv = require('dotenv');
const logger = require('../lib/logger'); // Import Winston logger

class EmailService {
  constructor() {
    // Charger les variables d'environnement si ce n'est pas déjà fait
    dotenv.config();

    // Initialisation des propriétés essentielles
    this.apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@wealthlog.com';
    this.resendUrl = 'https://api.resend.com/emails';
    this.frontendUrl = process.env.ALLOWED_ORIGIN || 'https://www.bechays.com';

    // Validation des configurations essentielles
    if (!this.apiKey && process.env.NODE_ENV === 'production') {
      logger.warn('⚠️ RESEND_API_KEY is not set - email functionality will not work');
    }

    if (!this.fromEmail) {
      logger.warn('⚠️ FROM_EMAIL is not set - using default sender address');
    }
  }

  generateVerificationToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  generateTokenExpiry() {
    return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }

  async sendEmail(to, subject, html, text) {
    // Validation de base
    if (!this.apiKey) {
      // No logger here as this is a hard configuration error before logger might be fully available or for critical paths
      throw new Error('RESEND_API_KEY not configured');
    }

    // Empêcher l'envoi vers des domaines de test en production
    if (process.env.NODE_ENV === 'production' &&
        (to.includes('example.com') || to.includes('test.com'))) {
      logger.warn(`Blocked email to test domain in production: ${to}`, { to });
      throw new Error('Cannot send emails to test domains in production');
    }

    try {
      // Node.js 18+ a fetch intégré, sinon utilise node-fetch
      const fetch = globalThis.fetch || require('node-fetch');

      const response = await fetch(this.resendUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject: subject,
          html: html,
          text: text
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Resend API error', { status: response.status, errorText, to, subject });
        throw new Error(`Resend API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      logger.info(`Email sent successfully: ${subject} to ${to}`, {
        emailId: result.id,
        to,
        subject,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });

      return result;
    } catch (error) {
      logger.error(`Failed to send email: ${subject} to ${to}`, {
        error: error.message,
        stack: error.stack,
        to,
        subject,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
      throw error;
    }
  }

  async sendVerificationEmail(userEmail, username, verificationToken) {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your WealthLog account</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 10px;">
          <h1 style="color: #2c3e50; margin-bottom: 30px;">Welcome to WealthLog!</h1>

          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #34495e; margin-bottom: 20px;">Hi ${username}!</h2>

            <p style="font-size: 16px; margin-bottom: 25px;">
              Thank you for registering with WealthLog. To complete your registration and start managing your wealth, please verify your email address.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="background-color: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Verify My Email
              </a>
            </div>

            <p style="font-size: 14px; color: #7f8c8d; margin-top: 25px;">
              If the button doesn't work, you can also copy and paste this link into your browser:
            </p>

            <p style="word-break: break-all; color: #3498db; font-size: 14px; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
              ${verificationUrl}
            </p>

            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
              <p style="font-size: 12px; color: #95a5a6;">
                This verification link will expire in 24 hours. If you didn't create this account, you can ignore this email.
              </p>
            </div>
          </div>

          <div style="margin-top: 30px;">
            <p style="font-size: 12px; color: #7f8c8d;">
              © 2025 WealthLog. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to WealthLog!

      Hi ${username}!

      Thank you for registering with WealthLog. To complete your registration, please verify your email address by clicking the link below:

      ${verificationUrl}

      This link will expire in 24 hours.

      If you didn't create this account, you can ignore this email.

      © 2025 WealthLog. All rights reserved.
    `;

    try {
      const result = await this.sendEmail(userEmail, 'Verify your WealthLog account', html, text);
      logger.info(`Verification email sent to ${userEmail}`, { userEmail });
      return result;
    } catch (error) {
      logger.error('Failed to send verification email', { userEmail, message: error.message, stack: error.stack });

      if (process.env.NODE_ENV === 'development') {
        logger.warn('Email failed in development (sendVerificationEmail), continuing anyway...', { userEmail });
        return { warning: 'Email could not be sent but account was created' };
      }

      throw new Error('Failed to send verification email');
    }
  }

  async sendWelcomeEmail(userEmail, username) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to WealthLog</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 10px;">
          <h1 style="color: #27ae60; margin-bottom: 30px;">🎉 Welcome to WealthLog!</h1>

          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #34495e; margin-bottom: 20px;">Hi ${username}!</h2>

            <p style="font-size: 16px; margin-bottom: 25px;">
              Congratulations! Your email has been successfully verified and your WealthLog account is now active.
            </p>

            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #2c3e50; margin-bottom: 15px;">What's next?</h3>
              <ul style="text-align: left; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Start tracking your investments and trades</li>
                <li style="margin-bottom: 10px;">Set up your financial accounts</li>
                <li style="margin-bottom: 10px;">Explore our analytics and insights</li>
                <li style="margin-bottom: 10px;">Join our community of investors</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.frontendUrl}/dashboard"
                 style="background-color: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Go to Dashboard
              </a>
            </div>

            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
              <p style="font-size: 12px; color: #95a5a6;">
                Need help getting started? Check out our help center or contact our support team.
              </p>
            </div>
          </div>

          <div style="margin-top: 30px;">
            <p style="font-size: 12px; color: #7f8c8d;">
              © 2025 WealthLog. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to WealthLog!

      Hi ${username}!

      Congratulations! Your email has been successfully verified and your WealthLog account is now active.

      What's next?
      - Start tracking your investments and trades
      - Set up your financial accounts
      - Explore our analytics and insights
      - Join our community of investors

      Visit your dashboard: ${this.frontendUrl}/dashboard

      Need help? Contact our support team.

      © 2025 WealthLog. All rights reserved.
    `;

    try {
      const result = await this.sendEmail(userEmail, 'Welcome to WealthLog - Your account is verified!', html, text);
      logger.info(`Welcome email sent to ${userEmail}`, { userEmail });
      return result;
    } catch (error) {
      logger.error('Failed to send welcome email', { userEmail, message: error.message, stack: error.stack });

      if (process.env.NODE_ENV === 'development') {
        logger.warn('Welcome email failed in development, continuing anyway...', { userEmail });
        return { warning: 'Welcome email could not be sent but verification succeeded' };
      }

      logger.warn('Welcome email failed but verification succeeded', { userEmail });
      return { warning: 'Welcome email could not be sent but verification succeeded' };
    }
  }

  async sendPasswordResetEmail(userEmail, username, resetToken) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your WealthLog password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 10px;">
          <h1 style="color: #e74c3c; margin-bottom: 30px;">🔒 Password Reset Request</h1>

          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #34495e; margin-bottom: 20px;">Hi ${username}!</h2>

            <p style="font-size: 16px; margin-bottom: 25px;">
              We received a request to reset the password for your WealthLog account. If you made this request, click the button below to reset your password.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Reset My Password
              </a>
            </div>

            <p style="font-size: 14px; color: #7f8c8d; margin-top: 25px;">
              If the button doesn't work, you can also copy and paste this link into your browser:
            </p>

            <p style="word-break: break-all; color: #e74c3c; font-size: 14px; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>

            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
              <p style="font-size: 12px; color: #95a5a6;">
                This password reset link will expire in 1 hour. If you didn't request this reset, you can ignore this email and your password will remain unchanged.
              </p>
            </div>
          </div>

          <div style="margin-top: 30px;">
            <p style="font-size: 12px; color: #7f8c8d;">
              © 2025 WealthLog. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request

      Hi ${username}!

      We received a request to reset the password for your WealthLog account. If you made this request, use the link below to reset your password:

      ${resetUrl}

      This link will expire in 1 hour.

      If you didn't request this reset, you can ignore this email and your password will remain unchanged.

      © 2025 WealthLog. All rights reserved.
    `;

    try {
      const result = await this.sendEmail(userEmail, 'Reset your WealthLog password', html, text);
      logger.info(`Password reset email sent to ${userEmail}`, { userEmail });
      return result;
    } catch (error) {
      logger.error('Failed to send password reset email', { userEmail, message: error.message, stack: error.stack });
      throw new Error('Failed to send password reset email');
    }
  }

  // Méthode utilitaire pour valider un email
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Méthode pour nettoyer/normaliser les emails
  normalizeEmail(email) {
    return email.toLowerCase().trim();
  }
}

module.exports = new EmailService();
