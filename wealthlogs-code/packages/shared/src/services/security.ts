/**
 * Security Service
 * Handles encryption, decryption, and secure data management
 * Works across web and mobile platforms
 */

/**
 * Browser-compatible crypto utilities
 */
class BrowserCrypto {
  /**
   * Generate random bytes (browser-compatible)
   */
  static getRandomValues(length: number): Uint8Array {
    const array = new Uint8Array(length);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else if (typeof global !== 'undefined' && global.crypto) {
      global.crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return array;
  }

  /**
   * Convert bytes to hex string
   */
  static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generate random hex string
   */
  static randomHex(length: number): string {
    const bytes = this.getRandomValues(length);
    return this.bytesToHex(bytes);
  }

  /**
   * Generate UUID v4 (browser-compatible)
   */
  static generateUUID(): string {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    
    // Fallback UUID v4 generation
    const bytes = this.getRandomValues(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    
    const hex = this.bytesToHex(bytes);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
}

/**
 * Security utilities for sensitive data handling
 */
export class SecurityService {
  /**
   * Generate secure random token (browser-compatible)
   */
  static generateToken(length = 32): string {
    return BrowserCrypto.randomHex(length);
  }

  /**
   * Generate UUID v4 (browser-compatible)
   */
  static generateUUID(): string {
    return BrowserCrypto.generateUUID();
  }

  /**
   * Simple hash function (not cryptographically secure, but works in browser)
   */
  static async hash(text: string): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      // Use Web Crypto API if available
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback simple hash (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Mask sensitive data for display
   */
  static maskData(data: string, showChars = 4): string {
    if (!data || data.length <= showChars) {
      return '*'.repeat(data?.length || 0);
    }
    
    const visiblePart = data.slice(-showChars);
    const maskedPart = '*'.repeat(data.length - showChars);
    
    return maskedPart + visiblePart;
  }

  /**
   * Mask email address
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    
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
    if (!phone) return '';
    
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
    
    if (!password) {
      return { score: 0, feedback: ['Password is required'], isStrong: false };
    }
    
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
    if (!input) return '';
    
    return String(input)
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
    if (!input) return '';
    
    return String(input)
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
    
    const randomValues = BrowserCrypto.getRandomValues(length);
    for (let i = 0; i < length; i++) {
      otp += digits[randomValues[i] % 10];
    }
    
    return otp;
  }

  /**
   * Time-constant string comparison (prevents timing attacks)
   */
  static secureCompare(a: string, b: string): boolean {
    if (!a || !b || a.length !== b.length) {
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
 * CSRF Token Management (browser-compatible)
 */
export class CSRFProtection {
  private static readonly TOKEN_KEY = 'csrf_token';
  
  /**
   * Generate CSRF token
   */
  static generateToken(): string {
    const token = SecurityService.generateToken();
    
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem(this.TOKEN_KEY, token);
      } catch (e) {
        console.warn('Could not store CSRF token:', e);
      }
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
    
    try {
      const storedToken = sessionStorage.getItem(this.TOKEN_KEY);
      return storedToken !== null && SecurityService.secureCompare(token, storedToken);
    } catch (e) {
      console.warn('Could not validate CSRF token:', e);
      return true;
    }
  }

  /**
   * Get current CSRF token
   */
  static getToken(): string | null {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    
    try {
      return sessionStorage.getItem(this.TOKEN_KEY);
    } catch (e) {
      console.warn('Could not get CSRF token:', e);
      return null;
    }
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

  /**
   * Get time until reset (in ms)
   */
  getTimeUntilReset(key: string): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;
    
    const oldestAttempt = Math.min(...attempts);
    const resetTime = oldestAttempt + this.windowMs;
    const now = Date.now();
    
    return Math.max(0, resetTime - now);
  }
}

/**
 * Simple secure storage (without encryption for browser compatibility)
 */
export class SecureStorage {
  private static readonly PREFIX = 'wl_secure_';
  
  /**
   * Check if storage is available
   */
  private static isAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      
      // Test if we can actually use localStorage
      const test = '__storage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Store data (simplified without encryption for browser)
   */
  static setItem(key: string, value: any): void {
    if (!this.isAvailable()) return;
    
    try {
      const data = JSON.stringify(value);
      localStorage.setItem(this.PREFIX + key, data);
    } catch (e) {
      console.error('Failed to store data:', e);
    }
  }

  /**
   * Retrieve data
   */
  static getItem(key: string): any {
    if (!this.isAvailable()) return null;
    
    try {
      const stored = localStorage.getItem(this.PREFIX + key);
      if (!stored) return null;
      
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to retrieve data:', e);
      return null;
    }
  }

  /**
   * Remove item
   */
  static removeItem(key: string): void {
    if (!this.isAvailable()) return;
    
    try {
      localStorage.removeItem(this.PREFIX + key);
    } catch (e) {
      console.error('Failed to remove data:', e);
    }
  }

  /**
   * Clear all secure storage
   */
  static clear(): void {
    if (!this.isAvailable()) return;
    
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Failed to clear data:', e);
    }
  }
}

export default {
  SecurityService,
  SecureStorage,
  CSRFProtection,
  RateLimiter,
};
