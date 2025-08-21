// src/services/emailservice.js

const { Resend } = require('resend');

class EmailService {
  constructor() {
    // Initialize Resend if API key is provided
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.fromEmail = process.env.FROM_EMAIL || 'noreply@wealthlog.com';
      this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    } else {
      console.warn('Email service not configured. Emails will be logged to console in development.');
      this.resend = null;
    }
  }

  /**
   * Send email using Resend or log to console in development
   */
  async sendEmail({ to, subject, html, text }) {
    if (this.resend) {
      try {
        const result = await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
          text: text || this.stripHtml(html)
        });
        console.log(`Email sent successfully to ${to}`);
        return result;
      } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
      }
    } else {
      // Development mode - log email to console
      console.log('📧 EMAIL SIMULATION (Development Mode)');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Content:', text || this.stripHtml(html));
      console.log('-----------------------------------');
      return { id: 'dev-email-' + Date.now() };
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email, username, token) {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to WealthLog!</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <p>Thank you for signing up for WealthLog! Please verify your email address to complete your registration.</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">
                ${verificationUrl}
              </p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account with WealthLog, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2024 WealthLog. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify your WealthLog account',
      html
    });
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email, username) {
    const dashboardUrl = `${this.frontendUrl}/landing/landing`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .features { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to WealthLog!</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <p>Your email has been verified successfully! You're all set to start managing your wealth with WealthLog.</p>
              
              <div class="features">
                <h3>What you can do now:</h3>
                <ul>
                  <li>📊 Track your portfolio performance</li>
                  <li>💼 Manage multiple financial accounts</li>
                  <li>📈 Monitor your trades and investments</li>
                  <li>🏠 Track real estate investments</li>
                  <li>💳 Manage expenses and loans</li>
                </ul>
              </div>
              
              <p style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
              </p>
              
              <p>Need help getting started? Check out our documentation or contact support.</p>
            </div>
            <div class="footer">
              <p>© 2024 WealthLog. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to WealthLog!',
      html
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, username, token) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <p>We received a request to reset your password for your WealthLog account.</p>
              
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">
                ${resetUrl}
              </p>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this, please ignore this email</li>
                  <li>Your password won't be changed until you click the link and create a new one</li>
                </ul>
              </div>
              
              <p>For security reasons, if you didn't request this password reset, we recommend you:</p>
              <ul>
                <li>Check your account for any unauthorized activity</li>
                <li>Consider changing your password if you suspect any security issues</li>
              </ul>
            </div>
            <div class="footer">
              <p>© 2024 WealthLog. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Reset your WealthLog password',
      html
    });
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedEmail(email, username) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert { background: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Changed Successfully</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              
              <div class="alert">
                <strong>✅ Your password has been changed successfully!</strong>
              </div>
              
              <p>This email confirms that your WealthLog account password was changed on ${new Date().toLocaleString()}.</p>
              
              <p><strong>If you made this change:</strong> No further action is needed. You can now log in with your new password.</p>
              
              <p><strong>If you didn't make this change:</strong></p>
              <ul>
                <li>Your account may be compromised</li>
                <li>Please contact our support team immediately</li>
                <li>Try to reset your password again using the forgot password option</li>
              </ul>
              
              <p>For your security, we recommend:</p>
              <ul>
                <li>Using a strong, unique password</li>
                <li>Enabling two-factor authentication (coming soon)</li>
                <li>Regularly reviewing your account activity</li>
              </ul>
            </div>
            <div class="footer">
              <p>© 2024 WealthLog. All rights reserved.</p>
              <p>This is an automated security notification.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Your WealthLog password has been changed',
      html
    });
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Normalize email (lowercase and trim)
   */
  normalizeEmail(email) {
    return email.toLowerCase().trim();
  }

  /**
   * Strip HTML tags from string
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }
}

module.exports = new EmailService();
