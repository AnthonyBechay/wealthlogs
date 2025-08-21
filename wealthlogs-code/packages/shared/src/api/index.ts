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
  private refreshPromise: Promise<string> | null = null;

  constructor(config: ApiConfig, tokenStorage?: TokenStorage) {
    this.tokenStorage = tokenStorage || createTokenStorage();
    
    this.api = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      withCredentials: true, // Important for cookies
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

    // Response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Check if it's a token expired error
          if (error.response?.data?.code === 'TOKEN_EXPIRED') {
            try {
              const newToken = await this.refreshAccessToken();
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            } catch (refreshError) {
              // Refresh failed, clear token
              await this.clearToken();
              return Promise.reject(refreshError);
            }
          }
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

  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.api
      .post<AuthResponse>('/api/auth/refresh')
      .then((response) => {
        const token = response.data.accessToken || response.data.token;
        if (!token) {
          throw new Error('No token received from refresh');
        }
        this.setToken(token);
        this.refreshPromise = null;
        return token;
      })
      .catch((error) => {
        this.refreshPromise = null;
        throw error;
      });

    return this.refreshPromise;
  }

  // Auth methods - ALL should use /api prefix
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await this.api.post('/api/auth/login', credentials);
      const token = response.data.accessToken || response.data.token;
      if (token) {
        await this.setToken(token);
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }

  async register(data: RegisterData): Promise<{ message: string; userId: number }> {
    try {
      const response = await this.api.post('/api/auth/register', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/api/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      await this.clearToken();
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.api.get('/api/auth/me');
      return response.data.user || response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get current user');
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await this.api.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Password reset request failed');
    }
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    try {
      const response = await this.api.post('/api/auth/reset-password', { token, password });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Password reset failed');
    }
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const response = await this.api.get(`/api/auth/verify-email?token=${token}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Email verification failed');
    }
  }

  // Financial Account methods - ALL should use /api prefix
  async getAccounts(): Promise<FinancialAccount[]> {
    try {
      const response = await this.api.get('/api/account');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get accounts');
    }
  }

  async getAccount(id: number): Promise<FinancialAccount> {
    try {
      const response = await this.api.get(`/api/account/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get account');
    }
  }

  async createAccount(account: Partial<FinancialAccount>): Promise<FinancialAccount> {
    try {
      const response = await this.api.post('/api/account', account);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create account');
    }
  }

  async updateAccount(id: number, updates: Partial<FinancialAccount>): Promise<FinancialAccount> {
    try {
      const response = await this.api.put(`/api/account/${id}`, updates);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update account');
    }
  }

  async deleteAccount(id: number, cascade?: boolean): Promise<void> {
    try {
      const url = cascade !== undefined 
        ? `/api/account/${id}?cascade=${cascade}`
        : `/api/account/${id}`;
      await this.api.delete(url);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete account');
    }
  }

  // Trade methods - ALL should use /api prefix
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

      const response = await this.api.get(`/api/trade?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get trades');
    }
  }

  async getTrade(id: number): Promise<Trade> {
    try {
      const response = await this.api.get(`/api/trade/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get trade');
    }
  }

  async createTrade(trade: Partial<Trade>): Promise<Trade> {
    try {
      const response = await this.api.post('/api/trade', trade);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create trade');
    }
  }

  async updateTrade(id: number, updates: Partial<Trade>): Promise<Trade> {
    try {
      const response = await this.api.put(`/api/trade/${id}`, updates);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update trade');
    }
  }

  async deleteTrade(id: number): Promise<void> {
    try {
      await this.api.delete(`/api/trade/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete trade');
    }
  }

  // Transaction methods - ALL should use /api prefix
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

      const response = await this.api.get(`/api/transactions?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get transactions');
    }
  }

  async createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
    try {
      const response = await this.api.post('/api/transactions', transaction);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create transaction');
    }
  }

  // Dashboard methods - ALL should use /api prefix
  async getDashboard(range?: string): Promise<any> {
    try {
      const url = range ? `/api/dashboard/networth?range=${range}` : '/api/dashboard/networth';
      const response = await this.api.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get dashboard data');
    }
  }

  async getDashboardSummary(): Promise<any> {
    try {
      const response = await this.api.get('/api/dashboard/networth/summary');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get dashboard summary');
    }
  }

  // Settings methods - ALL should use /api prefix
  async getTradingSettings(): Promise<any> {
    try {
      const response = await this.api.get('/api/tradingSettings');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get trading settings');
    }
  }

  async updateTradingSettings(settings: any): Promise<any> {
    try {
      const response = await this.api.put('/api/tradingSettings', settings);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update trading settings');
    }
  }

  async getGeneralSettings(): Promise<any> {
    try {
      const response = await this.api.get('/api/generalSettings');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get general settings');
    }
  }

  async updateGeneralSettings(settings: any): Promise<any> {
    try {
      const response = await this.api.put('/api/generalSettings', settings);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update general settings');
    }
  }

  // Real Estate methods - ALL should use /api prefix
  async getRealEstateProperties(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/real-estate/properties');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get properties');
    }
  }

  async createRealEstateProperty(property: any): Promise<any> {
    try {
      const response = await this.api.post('/api/real-estate/properties', property);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create property');
    }
  }

  async updateRealEstateProperty(id: number, updates: any): Promise<any> {
    try {
      const response = await this.api.put(`/api/real-estate/properties/${id}`, updates);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update property');
    }
  }

  async deleteRealEstateProperty(id: number): Promise<void> {
    try {
      await this.api.delete(`/api/real-estate/properties/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete property');
    }
  }

  async getRealEstateExpenses(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/real-estate/expenses');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get expenses');
    }
  }

  async createRealEstateExpense(expense: any): Promise<any> {
    try {
      const response = await this.api.post('/api/real-estate/expenses', expense);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create expense');
    }
  }

  // Admin methods - ALL should use /api prefix
  async getAdminRoles(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/admin/roles');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get roles');
    }
  }

  async addUserRole(userId: number, roleId: number): Promise<any> {
    try {
      const response = await this.api.post(`/api/admin/users/${userId}/addRole`, { roleId });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to add role');
    }
  }

  // Status History methods - ALL should use /api prefix
  async getAccountStatusHistory(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/account/status-history');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get status history');
    }
  }

  async updateAccountStatus(accountId: number, status: { active: boolean; reason?: string; comment?: string }): Promise<any> {
    try {
      const response = await this.api.patch(`/api/account/${accountId}/status`, status);
      return response.data;
    } catch (error: any) {
      // Fallback to simple update if new endpoint doesn't exist
      if (error.response?.status === 404) {
        const response = await this.api.patch(`/api/account/${accountId}`, { active: status.active });
        return response.data;
      }
      throw new Error(error.response?.data?.error || 'Failed to update account status');
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.currentToken;
  }

  getToken(): string | null {
    return this.currentToken;
  }

  // Get raw axios instance for direct calls
  getApiInstance(): AxiosInstance {
    return this.api;
  }

  // Generic methods for direct API calls (backward compatibility)
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Ensure /api prefix if not present
    const apiUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
    return this.api.get<T>(apiUrl, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Ensure /api prefix if not present
    const apiUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
    return this.api.post<T>(apiUrl, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Ensure /api prefix if not present
    const apiUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
    return this.api.put<T>(apiUrl, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Ensure /api prefix if not present
    const apiUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
    return this.api.patch<T>(apiUrl, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Ensure /api prefix if not present
    const apiUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
    return this.api.delete<T>(apiUrl, config);
  }

  // File upload method
  async uploadFile(endpoint: string, file: File | Blob, fileName?: string): Promise<any> {
    try {
      const formData = new FormData();
      
      if (file instanceof File) {
        formData.append('file', file);
      } else {
        formData.append('file', file, fileName || 'upload.jpg');
      }

      const apiUrl = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      const response = await this.api.post(apiUrl, formData, {
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
