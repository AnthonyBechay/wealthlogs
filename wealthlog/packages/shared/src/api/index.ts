import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { TokenStorage, createTokenStorage } from '../storage/index';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  FinancialAccount,
  Trade,
  Transaction,
  ApiResponse,
  PaginatedResponse,
  ApiConfig,
} from '../types/index';

export class WealthLogAPI {
  private api: AxiosInstance;
  private tokenStorage: TokenStorage;
  private currentToken: string | null = null;

  constructor(config: ApiConfig, tokenStorage?: TokenStorage) {
    this.tokenStorage = tokenStorage || createTokenStorage();
    
    this.api = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.initializeToken();
  }

  private async initializeToken() {
    try {
      this.currentToken = await this.tokenStorage.getToken();
      if (this.currentToken) {
        this.updateAuthHeader(this.currentToken);
      }
    } catch (error) {
      console.warn('Failed to initialize token:', error);
    }
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        if (this.currentToken && config.headers) {
          config.headers.Authorization = `Bearer ${this.currentToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await this.clearToken();
        }
        return Promise.reject(error);
      }
    );
  }

  private updateAuthHeader(token: string) {
    this.api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  private async setToken(token: string) {
    this.currentToken = token;
    this.updateAuthHeader(token);
    await this.tokenStorage.setToken(token);
  }

  private async clearToken() {
    this.currentToken = null;
    delete this.api.defaults.headers.common.Authorization;
    await this.tokenStorage.removeToken();
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', credentials);
      await this.setToken(response.data.token);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }

  async register(data: RegisterData): Promise<{ message: string; userId: number }> {
    try {
      const response = await this.api.post('/auth/register', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      // Logout should always clear local token even if server call fails
      console.warn('Logout API call failed:', error);
    } finally {
      await this.clearToken();
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.api.get('/auth/me');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get current user');
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await this.api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Password reset request failed');
    }
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    try {
      const response = await this.api.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Password reset failed');
    }
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const response = await this.api.get(`/auth/verify-email?token=${token}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Email verification failed');
    }
  }

  // Financial Account methods
  async getAccounts(): Promise<FinancialAccount[]> {
    try {
      const response = await this.api.get('/account');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get accounts');
    }
  }

  async getAccount(id: number): Promise<FinancialAccount> {
    try {
      const response = await this.api.get(`/account/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get account');
    }
  }

  async createAccount(account: Partial<FinancialAccount>): Promise<FinancialAccount> {
    try {
      const response = await this.api.post('/account', account);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create account');
    }
  }

  async updateAccount(id: number, updates: Partial<FinancialAccount>): Promise<FinancialAccount> {
    try {
      const response = await this.api.put(`/account/${id}`, updates);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update account');
    }
  }

  async deleteAccount(id: number): Promise<void> {
    try {
      await this.api.delete(`/account/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete account');
    }
  }

  // Trade methods
  async getTrades(accountId?: number, params?: Record<string, any>): Promise<PaginatedResponse<Trade>> {
    try {
      const queryParams = new URLSearchParams();
      if (accountId) queryParams.append('accountId', accountId.toString());
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const response = await this.api.get(`/trade?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get trades');
    }
  }

  async getTrade(id: number): Promise<Trade> {
    try {
      const response = await this.api.get(`/trade/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get trade');
    }
  }

  async createTrade(trade: Partial<Trade>): Promise<Trade> {
    try {
      const response = await this.api.post('/trade', trade);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create trade');
    }
  }

  async updateTrade(id: number, updates: Partial<Trade>): Promise<Trade> {
    try {
      const response = await this.api.put(`/trade/${id}`, updates);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update trade');
    }
  }

  async deleteTrade(id: number): Promise<void> {
    try {
      await this.api.delete(`/trade/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete trade');
    }
  }

  // Transaction methods
  async getTransactions(accountId?: number, params?: Record<string, any>): Promise<PaginatedResponse<Transaction>> {
    try {
      const queryParams = new URLSearchParams();
      if (accountId) queryParams.append('accountId', accountId.toString());
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const response = await this.api.get(`/transactions?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get transactions');
    }
  }

  async createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
    try {
      const response = await this.api.post('/transactions', transaction);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create transaction');
    }
  }

  // Dashboard methods
  async getDashboard(): Promise<any> {
    try {
      const response = await this.api.get('/dashboard');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get dashboard data');
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.currentToken;
  }

  getToken(): string | null {
    return this.currentToken;
  }

  // File upload method (for mobile/web compatibility)
  async uploadFile(endpoint: string, file: File | Blob, fileName?: string): Promise<any> {
    try {
      const formData = new FormData();
      
      if (file instanceof File) {
        formData.append('file', file);
      } else {
        // Handle Blob (could be from mobile camera)
        formData.append('file', file, fileName || 'upload.jpg');
      }

      const response = await this.api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'File upload failed');
    }
  }
}

// Default API instance factory
export function createWealthLogAPI(baseURL?: string, tokenStorage?: TokenStorage): WealthLogAPI {
  const config: ApiConfig = {
    baseURL: baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  };
  
  return new WealthLogAPI(config, tokenStorage);
}

// Platform detection utilities
export function getPlatform() {
  const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
  const isIOS = isCapacitor && (window as any).Capacitor.getPlatform() === 'ios';
  const isAndroid = isCapacitor && (window as any).Capacitor.getPlatform() === 'android';
  const isWeb = typeof window !== 'undefined' && !isCapacitor;
  const isMobile = isIOS || isAndroid;

  return {
    isWeb,
    isMobile,
    isIOS,
    isAndroid,
    isCapacitor,
  };
}
