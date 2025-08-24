/**
 * Data Validation Service
 * Provides consistent validation across web and mobile platforms
 */

import { ErrorFactory } from './error-handler';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  min?: number;
  max?: number;
  enum?: any[];
  email?: boolean;
  url?: boolean;
  phone?: boolean;
  date?: boolean;
  strongPassword?: boolean;
}

export interface ValidationSchema {
  [field: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  data?: Record<string, any>;
}

/**
 * Comprehensive data validator
 */
export class DataValidator {
  private static emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
  private static phoneRegex = /^\+?[\d\s()-]+$/;
  private static strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

  /**
   * Validate data against schema
   */
  static validate(data: Record<string, any>, schema: ValidationSchema): ValidationResult {
    const errors: Record<string, string[]> = {};
    const sanitizedData: Record<string, any> = {};
    
    // Validate each field
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors: string[] = [];
      
      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        fieldErrors.push(`${field} is required`);
      }
      
      // Skip other validations if field is empty and not required
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }
      
      // String validations
      if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          fieldErrors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
          fieldErrors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
        
        if (rules.pattern && !rules.pattern.test(value)) {
          fieldErrors.push(`${field} has invalid format`);
        }
        
        if (rules.email && !this.emailRegex.test(value)) {
          fieldErrors.push(`${field} must be a valid email`);
        }
        
        if (rules.url && !this.urlRegex.test(value)) {
          fieldErrors.push(`${field} must be a valid URL`);
        }
        
        if (rules.phone && !this.phoneRegex.test(value)) {
          fieldErrors.push(`${field} must be a valid phone number`);
        }
        
        if (rules.strongPassword && !this.strongPasswordRegex.test(value)) {
          fieldErrors.push(`${field} must contain uppercase, lowercase, number, and special character`);
        }
      }
      
      // Number validations
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          fieldErrors.push(`${field} must be at least ${rules.min}`);
        }
        
        if (rules.max !== undefined && value > rules.max) {
          fieldErrors.push(`${field} must be at most ${rules.max}`);
        }
      }
      
      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        fieldErrors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
      
      // Date validation
      if (rules.date) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          fieldErrors.push(`${field} must be a valid date`);
        }
      }
      
      // Custom validation
      if (rules.custom) {
        const result = rules.custom(value);
        if (typeof result === 'string') {
          fieldErrors.push(result);
        } else if (!result) {
          fieldErrors.push(`${field} validation failed`);
        }
      }
      
      // Add errors if any
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      } else {
        // Sanitize and add to clean data
        sanitizedData[field] = this.sanitize(value);
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      data: sanitizedData,
    };
  }

  /**
   * Sanitize input data
   */
  static sanitize(value: any): any {
    if (typeof value === 'string') {
      // Remove leading/trailing whitespace
      value = value.trim();
      
      // Escape HTML entities
      value = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    return value;
  }

  /**
   * Validate and throw error if invalid
   */
  static validateOrThrow(data: Record<string, any>, schema: ValidationSchema): Record<string, any> {
    const result = this.validate(data, schema);
    
    if (!result.isValid) {
      throw ErrorFactory.validationError('Validation failed', result.errors);
    }
    
    return result.data!;
  }
}

/**
 * Common validation schemas
 */
export class ValidationSchemas {
  static readonly userRegistration: ValidationSchema = {
    username: {
      required: true,
      minLength: 3,
      maxLength: 30,
      pattern: /^[a-zA-Z0-9_-]+$/,
    },
    email: {
      required: true,
      email: true,
    },
    password: {
      required: true,
      minLength: 8,
      strongPassword: true,
    },
    firstName: {
      required: true,
      minLength: 1,
      maxLength: 50,
    },
    lastName: {
      required: true,
      minLength: 1,
      maxLength: 50,
    },
  };

  static readonly userLogin: ValidationSchema = {
    username: {
      required: true,
    },
    password: {
      required: true,
    },
  };

  static readonly createAccount: ValidationSchema = {
    name: {
      required: true,
      minLength: 1,
      maxLength: 100,
    },
    type: {
      required: true,
      enum: ['CASH', 'STOCKS', 'CRYPTO', 'REAL_ESTATE', 'FX', 'PERSONAL_EXPENSES'],
    },
    balance: {
      required: false,
      min: 0,
    },
    currency: {
      required: true,
      pattern: /^[A-Z]{3}$/,
    },
  };

  static readonly createTransaction: ValidationSchema = {
    accountId: {
      required: true,
      min: 1,
    },
    amount: {
      required: true,
      min: 0.01,
    },
    type: {
      required: true,
      enum: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'INCOME', 'EXPENSE'],
    },
    category: {
      required: false,
      maxLength: 50,
    },
    description: {
      required: false,
      maxLength: 500,
    },
    date: {
      required: true,
      date: true,
    },
  };

  static readonly updateProfile: ValidationSchema = {
    firstName: {
      minLength: 1,
      maxLength: 50,
    },
    lastName: {
      minLength: 1,
      maxLength: 50,
    },
    email: {
      email: true,
    },
    phone: {
      phone: true,
    },
  };
}

/**
 * Field-level validators for common use cases
 */
export class FieldValidators {
  static isValidEmail(email: string): boolean {
    return DataValidator['emailRegex'].test(email);
  }

  static isValidUrl(url: string): boolean {
    return DataValidator['urlRegex'].test(url);
  }

  static isValidPhone(phone: string): boolean {
    return DataValidator['phoneRegex'].test(phone);
  }

  static isStrongPassword(password: string): boolean {
    return DataValidator['strongPasswordRegex'].test(password) && password.length >= 8;
  }

  static isValidCurrency(currency: string): boolean {
    return /^[A-Z]{3}$/.test(currency);
  }

  static isValidUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  }

  static isValidDate(date: string | Date): boolean {
    const d = new Date(date);
    return !isNaN(d.getTime());
  }

  static isValidAmount(amount: number): boolean {
    return !isNaN(amount) && amount > 0 && Number.isFinite(amount);
  }
}

export default {
  DataValidator,
  ValidationSchemas,
  FieldValidators,
};
