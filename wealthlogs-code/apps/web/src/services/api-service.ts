/**
 * Frontend API Service
 * Clean implementation with basic security features
 */

import {
  ApiClient,
  createApiClient,
  AppError,
  ErrorCode,
  CSRFProtection,
  SecurityService,
  logger,
  metrics,
  RateLimiter
} from '@wealthlog/shared';

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create singleton API client instance
let apiClient: ApiClient | null = null;

/**
 * Initialize the API client
 */
export function initializeApiClient(): ApiClient {
  if (apiClient) return apiClient;

  apiClient = createApiClient({
    baseURL: `${API_URL}/api`,
    timeout: 30000,
    withCredentials: true
  });

  // Set up token from localStorage if exists
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    apiClient.setToken(accessToken);
  }

  // Generate CSRF token for security
  CSRFProtection.generateToken();

  return apiClient;
}

/**
 * Handle API errors with user feedback
 */
function handleApiError(error: AppError) {
  logger.error('API Error', error);
  metrics.increment('frontend.api.error');

  // Handle specific error codes
  switch (error.code) {
    case ErrorCode.AUTH_TOKEN_EXPIRED:
      // Redirect to login
      window.location.href = '/login';
      break;
    
    case ErrorCode.AUTH_UNAUTHORIZED:
      console.error('Unauthorized access');
      break;
    
    case ErrorCode.RATE_LIMIT_EXCEEDED:
      console.error('Too many requests. Please slow down.');
      break;
    
    default:
      console.error(error.message || 'An error occurred');
  }
}

/**
 * Auth Service with security features
 */
export class AuthService {
  private static rateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute

  /**
   * Login with rate limiting
   */
  static async login(username: string, password: string) {
    // Client-side rate limiting
    if (!this.rateLimiter.isAllowed('login')) {
      throw new AppError({
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many login attempts. Please wait.',
        statusCode: 429
      });
    }

    const timer = metrics.startTimer('auth.login');
    
    try {
      // Validate input
      if (!username || !password) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Username and password are required',
          statusCode: 400
        });
      }

      const response = await getApiClient().post<any>('/auth/login', {
        username,
        password
      });

      // Store tokens
      if (response.accessToken) {
        localStorage.setItem('accessToken', response.accessToken);
        getApiClient().setToken(response.accessToken);
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
   * Logout
   */
  static async logout() {
    try {
      await getApiClient().post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    } finally {
      // Clear all auth data
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
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Password is not strong enough',
        statusCode: 400,
        details: { feedback: passwordStrength.feedback }
      });
    }

    // Check password confirmation
    if (data.password !== data.confirmPassword) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
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
        getApiClient().setToken(response.accessToken);
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
    return getApiClient().get('/auth/me');
  }

  /**
   * Clear all auth data
   */
  private static clearAuthData() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('csrf_token');
    if (apiClient) {
      apiClient.setToken(null);
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
        code: ErrorCode.VALIDATION_FAILED,
        message: 'New password is not strong enough',
        statusCode: 400,
        details: { feedback: passwordStrength.feedback }
      });
    }

    // Ensure passwords are different
    if (currentPassword === newPassword) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
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
 * Dashboard Service
 */
export class DashboardService {
  /**
   * Get dashboard data
   */
  static async getDashboardData() {
    return getApiClient().get('/dashboard/networth');
  }

  /**
   * Get dashboard summary
   */
  static async getDashboardSummary() {
    return getApiClient().get('/dashboard/networth/summary');
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
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Account name is required',
        statusCode: 400
      });
    }

    if (data.balance && data.balance < 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Balance cannot be negative',
        statusCode: 400
      });
    }

    return getApiClient().post('/account', data);
  }

  /**
   * Get accounts
   */
  static async getAccounts() {
    return getApiClient().get('/account');
  }

  /**
   * Update account
   */
  static async updateAccount(id: number, data: any) {
    return getApiClient().put(`/account/${id}`, data);
  }

  /**
   * Delete account
   */
  static async deleteAccount(id: number) {
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
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Amount must be greater than 0',
        statusCode: 400
      });
    }

    // Validate date
    if (!data.date || !new Date(data.date).getTime()) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Valid date is required',
        statusCode: 400
      });
    }

    return getApiClient().post('/transactions', data);
  }

  /**
   * Get transactions
   */
  static async getTransactions(params?: any) {
    return getApiClient().get('/transactions', { params });
  }

  /**
   * Update transaction
   */
  static async updateTransaction(id: number, data: any) {
    return getApiClient().put(`/transactions/${id}`, data);
  }

  /**
   * Delete transaction
   */
  static async deleteTransaction(id: number) {
    return getApiClient().delete(`/transactions/${id}`);
  }
}

/**
 * Trading Service
 */
export class TradingService {
  /**
   * Get trades
   */
  static async getTrades(params?: any) {
    return getApiClient().get('/trades', { params });
  }

  /**
   * Create trade
   */
  static async createTrade(data: any) {
    return getApiClient().post('/trades', data);
  }

  /**
   * Update trade
   */
  static async updateTrade(id: number, data: any) {
    return getApiClient().put(`/trades/${id}`, data);
  }

  /**
   * Delete trade
   */
  static async deleteTrade(id: number) {
    return getApiClient().delete(`/trades/${id}`);
  }
}

/**
 * Expense Service
 */
export class ExpenseService {
  /**
   * Get expenses
   */
  static async getExpenses(params?: any) {
    return getApiClient().get('/expenses', { params });
  }

  /**
   * Create expense
   */
  static async createExpense(data: any) {
    return getApiClient().post('/expenses', data);
  }

  /**
   * Update expense
   */
  static async updateExpense(id: number, data: any) {
    return getApiClient().put(`/expenses/${id}`, data);
  }

  /**
   * Delete expense
   */
  static async deleteExpense(id: number) {
    return getApiClient().delete(`/expenses/${id}`);
  }
}

/**
 * Settings Service
 */
export class SettingsService {
  /**
   * Get general settings
   */
  static async getGeneralSettings() {
    return getApiClient().get('/generalSettings');
  }

  /**
   * Update general settings
   */
  static async updateGeneralSettings(data: any) {
    return getApiClient().post('/generalSettings', data);
  }

  /**
   * Get trading settings
   */
  static async getTradingSettings() {
    return getApiClient().get('/tradingSettings');
  }

  /**
   * Update trading settings
   */
  static async updateTradingSettings(data: any) {
    return getApiClient().post('/tradingSettings', data);
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
  TradingService,
  ExpenseService,
  SettingsService,
  getApiClient,
  initializeApiClient
};
