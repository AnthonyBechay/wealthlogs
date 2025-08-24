/**
 * Security Service
 * Handles encryption, decryption, and secure data management
 * Works across web and mobile platforms
 */

// Use dynamic import for crypto to support both Node.js and browser
let crypto: any;
if (typeof window === 'undefined') {
  // Node.js environment
  try {
    crypto = require('crypto');
  } catch (e) {
    // Crypto not available
  }
} else {
  // Browser environment
  crypto = window.crypto;
}

export interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
  algorithm: string;
}

/**
 * Security utilities for sensitive data handling
 */
export class SecurityService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly SALT_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;
  private static readonly ITERATIONS = 100000;

  /**
   * Encrypt sensitive data
   */
  static encrypt(text: string, password: string): EncryptedData {
    // Node.js specific implementation
    if (!crypto || !crypto.randomBytes) {
      throw new Error('Encryption not available in this environment');
    }
    
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const key = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, 32, 'sha256');
    const iv = crypto.randomBytes(this.IV_LENGTH);
    
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      data: salt.toString('hex') + ':' + encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      algorithm: this.ALGORITHM,
    };
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: EncryptedData, password: string): string {
    const parts = encryptedData.data.split(':');
    // Node.js specific implementation
    if (!crypto || typeof Buffer === 'undefined') {
      throw new Error('Decryption not available in this environment');
    }
    
    const salt = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const key = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, 32, 'sha256');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Hash sensitive data (one-way)
   */
  static hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Generate secure random token
   */
  static generateToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate UUID v4
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Mask sensitive data for display
   */
  static maskData(data: string, showChars = 4): string {
    if (data.length <= showChars) {
      return '*'.repeat(data.length);
    }
    
    const visiblePart = data.slice(-showChars);
    const maskedPart = '*'.repeat(data.length - showChars);
    
    return maskedPart + visiblePart;
  }

  /**
   * Mask email address
   */
  static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    
    if (username.length <= 3) {
      return '*'.repeat(username.length) + '@' + domain;
    }
    
    const visibleChars = username.slice(0, 2);
    const maskedChars = '*'.repeat(username.length - 2);
    
    return visibleChars + maskedChars + '@' + domain;
  }

  /**
   * Mask phone number
   */
  static maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length <= 4) {
      return '*'.repeat(digits.length);
    }
    
    const lastFour = digits.slice(-4);
    const maskedPart = '*'.repeat(digits.length - 4);
    
    return maskedPart + lastFour;
  }

  /**
   * Validate password strength
   */
  static getPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    let score = 0;
    const feedback: string[] = [];
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    else if (password.length < 8) feedback.push('Password should be at least 8 characters');
    
    // Complexity checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');
    
    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('Add special characters');
    
    // Common patterns to avoid
    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Avoid repeating characters');
    
    if (!/^(123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg)/.test(password.toLowerCase())) {
      score += 1;
    } else {
      feedback.push('Avoid sequential characters');
    }
    
    return {
      score: Math.min(score, 10),
      feedback,
      isStrong: score >= 7,
    };
  }

  /**
   * Sanitize user input to prevent XSS
   */
  static sanitizeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitize SQL input (basic - Prisma handles most of this)
   */
  static sanitizeSql(input: string): string {
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  /**
   * Generate secure OTP
   */
  static generateOTP(length = 6): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      otp += digits[randomIndex];
    }
    
    return otp;
  }

  /**
   * Time-constant string comparison (prevents timing attacks)
   */
  static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}

/**
 * Secure storage wrapper for sensitive data
 */
export class SecureStorage {
  private static isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  /**
   * Store encrypted data
   */
  static setItem(key: string, value: any, password: string): void {
    if (!this.isAvailable()) return;
    
    const data = JSON.stringify(value);
    const encrypted = SecurityService.encrypt(data, password);
    
    localStorage.setItem(key, JSON.stringify(encrypted));
  }

  /**
   * Retrieve and decrypt data
   */
  static getItem(key: string, password: string): any {
    if (!this.isAvailable()) return null;
    
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    try {
      const encrypted = JSON.parse(stored) as EncryptedData;
      const decrypted = SecurityService.decrypt(encrypted, password);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return null;
    }
  }

  /**
   * Remove item
   */
  static removeItem(key: string): void {
    if (!this.isAvailable()) return;
    localStorage.removeItem(key);
  }

  /**
   * Clear all secure storage
   */
  static clear(): void {
    if (!this.isAvailable()) return;
    localStorage.clear();
  }
}

/**
 * CSRF Token Management
 */
export class CSRFProtection {
  private static readonly TOKEN_KEY = 'csrf_token';
  
  /**
   * Generate CSRF token
   */
  static generateToken(): string {
    const token = SecurityService.generateToken();
    
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(this.TOKEN_KEY, token);
    }
    
    return token;
  }

  /**
   * Validate CSRF token
   */
  static validateToken(token: string): boolean {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return true; // Skip validation on server-side
    }
    
    const storedToken = sessionStorage.getItem(this.TOKEN_KEY);
    return storedToken !== null && SecurityService.secureCompare(token, storedToken);
  }

  /**
   * Get current CSRF token
   */
  static getToken(): string | null {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    
    return sessionStorage.getItem(this.TOKEN_KEY);
  }
}

/**
 * Rate limiting for client-side operations
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(
    private readonly maxAttempts: number = 5,
    private readonly windowMs: number = 60000 // 1 minute
  ) {}

  /**
   * Check if action is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    
    return true;
  }

  /**
   * Reset attempts for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(key: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxAttempts - validAttempts.length);
  }
}

export default {
  SecurityService,
  SecureStorage,
  CSRFProtection,
  RateLimiter,
};
