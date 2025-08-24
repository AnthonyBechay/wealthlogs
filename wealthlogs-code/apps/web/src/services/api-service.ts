/**
 * Enhanced Frontend API Service with Security Features
 * Provides secure API communication with automatic retry, caching, and error handling
 */

import {
  ApiClient,
  createApiClient,
  AppError,
  ErrorHandler,
  CSRFProtection,
  SecurityService,
  logger,
  metrics,
  RateLimiter
} from '@wealthlog/shared';
import { toast } from 'react-toastify'; // Assuming you have react-toastify

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create singleton API client instance
let apiClient: ApiClient | null = null;

/**
 * Initialize the API client with security features
 */
export function initializeApiClient() {
  if (apiClient) return apiClient;

  apiClient = createApiClient({
    baseURL: `${API_URL}/api`,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    enableCache: true,
    enableCircuitBreaker: true,
    enableRateLimiting: true,
    rateLimitMax: 100,
    rateLimitWindow: 60000
  });

  // Set up token management
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    apiClient.setTokens(accessToken);
  }

  // Add response interceptor for token refresh
  setupTokenRefreshInterceptor();

  // Add error handling
  setupGlobalErrorHandling();

  // Generate CSRF token
  CSRFProtection.generateToken();

  return apiClient;
}

/**
 * Setup token refresh interceptor
 */
function setupTokenRefreshInterceptor() {
  if (!apiClient) return;

  // This is handled internally by the ApiClient class
  // but we can add additional logic here if needed
}

/**
 * Setup global error handling
 */
function setupGlobalErrorHandling() {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof AppError) {
      handleApiError(event.reason);
      event.preventDefault();
    }
  });
}

/**
 * Handle API errors with user feedback
 */
function handleApiError(error: AppError) {
  logger.error('API Error', error);
  metrics.increment('frontend.api.error', { code: error.code });

  // Show user-friendly error messages
  switch (error.code) {
    case 'AUTH_TOKEN_EXPIRED':
      toast.warning('Your session has expired. Please login again.');
      window.location.href = '/login';
      break;
    
    case 'AUTH_UNAUTHORIZED':
      toast.error('You are not authorized to perform this action.');
      break;
    
    case 'RATE_LIMIT_EXCEEDED':
      toast.error('Too many requests. Please slow down.');
      break;
    
    case 'NETWORK_OFFLINE':
      toast.error('No internet connection. Please check your network.');
      break;
    
    case 'VALIDATION_FAILED':
      if (error.details) {
        const messages = Object.values(error.details).flat().join(', ');
        toast.error(`Validation error: ${messages}`);
      } else {
        toast.error('Please check your input and try again.');
      }
      break;
    
    default:
      toast.error(error.message || 'An error occurred. Please try again.');
  }
}

/**
 * Auth Service with security features
 */
export class AuthService {
  private static rateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute

  /**
   * Secure login with rate limiting
   */
  static async login(username: string, password: string) {
    // Client-side rate limiting
    if (!this.rateLimiter.isAllowed('login')) {
      throw new AppError({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please wait.',
        statusCode: 429
      });
    }

    const timer = metrics.startTimer('auth.login');
    
    try {
      // Validate input
      if (!username || !password) {
        throw new AppError({
          code: 'VALIDATION_FAILED',
          message: 'Username and password are required',
          statusCode: 400
        });
      }

      // Hash password before sending (optional extra security)
      // const hashedPassword = SecurityService.hash(password);

      const response = await getApiClient().post<any>('/auth/login', {
        username,
        password
      });

      // Store tokens securely
      if (response.accessToken) {
        localStorage.setItem('accessToken', response.accessToken);
        getApiClient().setTokens(response.accessToken);
      }

      // Store CSRF token
      if (response.csrfToken) {
        sessionStorage.setItem('csrf_token', response.csrfToken);
      }

      // Reset rate limiter on success
      this.rateLimiter.reset('login');

      timer();
      metrics.increment('auth.login.success');
      logger.info('Login successful');

      return response;
    } catch (error) {
      timer();
      metrics.increment('auth.login.failed');
      throw error;
    }
  }

  /**
   * Secure logout
   */
  static async logout() {
    try {
      await getApiClient().post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    } finally {
      // Clear all sensitive data
      this.clearAuthData();
      window.location.href = '/login';
    }
  }

  /**
   * Register with validation
   */
  static async register(data: any) {
    // Validate password strength
    const passwordStrength = SecurityService.getPasswordStrength(data.password);
    if (!passwordStrength.isStrong) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: 'Password is not strong enough',
        statusCode: 400,
        details: { feedback: passwordStrength.feedback }
      });
    }

    // Check password confirmation
    if (data.password !== data.confirmPassword) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: 'Passwords do not match',
        statusCode: 400
      });
    }

    const response = await getApiClient().post('/auth/register', data);
    return response;
  }

  /**
   * Refresh access token
   */
  static async refreshToken() {
    try {
      const response = await getApiClient().post<any>('/auth/refresh');
      
      if (response.accessToken) {
        localStorage.setItem('accessToken', response.accessToken);
        getApiClient().setTokens(response.accessToken);
      }

      return response;
    } catch (error) {
      this.clearAuthData();
      throw error;
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser() {
    return getApiClient().get('/auth/me', {
      cacheTTL: 5 * 60 * 1000 // Cache for 5 minutes
    });
  }

  /**
   * Clear all auth data
   */
  private static clearAuthData() {
    localStorage.removeItem('accessToken');
    sessionStorage.removeItem('csrf_token');
    getApiClient().clearAuth();
    
    // Clear sensitive data from memory
    if (typeof window !== 'undefined') {
      // Clear any cached user data
      window.sessionStorage.clear();
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  /**
   * Change password with validation
   */
  static async changePassword(currentPassword: string, newPassword: string) {
    // Validate new password strength
    const passwordStrength = SecurityService.getPasswordStrength(newPassword);
    if (!passwordStrength.isStrong) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: 'New password is not strong enough',
        statusCode: 400,
        details: { feedback: passwordStrength.feedback }
      });
    }

    // Ensure passwords are different
    if (currentPassword === newPassword) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: 'New password must be different from current password',
        statusCode: 400
      });
    }

    return getApiClient().post('/auth/change-password', {
      currentPassword,
      newPassword
    });
  }
}

/**
 * Dashboard Service with caching
 */
export class DashboardService {
  /**
   * Get dashboard data with caching
   */
  static async getDashboardData() {
    return getApiClient().get('/dashboard/networth', {
      cacheTTL: 60000 // Cache for 1 minute
    });
  }

  /**
   * Get dashboard summary with caching
   */
  static async getDashboardSummary() {
    return getApiClient().get('/dashboard/networth/summary', {
      cacheTTL: 60000 // Cache for 1 minute
    });
  }
}

/**
 * Account Service
 */
export class AccountService {
  /**
   * Create account with validation
   */
  static async createAccount(data: any) {
    // Client-side validation
    if (!data.name || data.name.length < 1) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: 'Account name is required',
        statusCode: 400
      });
    }

    if (data.balance && data.balance < 0) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: 'Balance cannot be negative',
        statusCode: 400
      });
    }

    return getApiClient().post('/account', data);
  }

  /**
   * Get accounts with caching
   */
  static async getAccounts() {
    return getApiClient().get('/account', {
      cacheTTL: 30000 // Cache for 30 seconds
    });
  }

  /**
   * Update account
   */
  static async updateAccount(id: number, data: any) {
    return getApiClient().put(`/account/${id}`, data);
  }

  /**
   * Delete account with confirmation
   */
  static async deleteAccount(id: number) {
    // Add confirmation dialog in UI before calling this
    return getApiClient().delete(`/account/${id}`);
  }
}

/**
 * Transaction Service
 */
export class TransactionService {
  /**
   * Create transaction with validation
   */
  static async createTransaction(data: any) {
    // Validate amount
    if (!data.amount || data.amount <= 0) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: 'Amount must be greater than 0',
        statusCode: 400
      });
    }

    // Validate date
    if (!data.date || !new Date(data.date).getTime()) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: 'Valid date is required',
        statusCode: 400
      });
    }

    return getApiClient().post('/transactions', data);
  }

  /**
   * Get transactions with pagination
   */
  static async getTransactions(params?: any) {
    return getApiClient().get('/transactions', {
      params,
      cacheTTL: 10000 // Cache for 10 seconds
    });
  }
}

/**
 * File Upload Service with security
 */
export class FileUploadService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private static readonly ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'text/plain'];

  /**
   * Upload image with validation
   */
  static async uploadImage(file: File, category: string) {
    // Validate file type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.',
        statusCode: 400
      });
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: `File size must be less than ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
        statusCode: 400
      });
    }

    // Scan file name for malicious patterns
    const sanitizedName = SecurityService.sanitizeHtml(file.name);
    if (sanitizedName !== file.name) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: 'File name contains invalid characters',
        statusCode: 400
      });
    }

    return getApiClient().uploadFile(`/upload/${category}`, file, (progress) => {
      logger.debug(`Upload progress: ${progress}%`);
    });
  }

  /**
   * Upload document with validation
   */
  static async uploadDocument(file: File) {
    // Validate file type
    if (!this.ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: 'Invalid file type. Only PDF, Word, and text files are allowed.',
        statusCode: 400
      });
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new AppError({
        code: 'VALIDATION_FAILED',
        message: `File size must be less than ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
        statusCode: 400
      });
    }

    return getApiClient().uploadFile('/upload/documents', file);
  }
}

/**
 * Get API client instance
 */
export function getApiClient(): ApiClient {
  if (!apiClient) {
    return initializeApiClient();
  }
  return apiClient;
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initializeApiClient();
}

export default {
  AuthService,
  DashboardService,
  AccountService,
  TransactionService,
  FileUploadService,
  getApiClient,
  initializeApiClient
};
