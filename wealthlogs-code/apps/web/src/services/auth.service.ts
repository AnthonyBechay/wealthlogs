// src/services/auth.service.ts

import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  emailVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  message?: string;
}

class AuthService {
  private api: AxiosInstance;
  private accessToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      withCredentials: true, // Important for cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        this.setAccessToken(token);
      }
    }
  }

  private setupInterceptors() {
    // Request interceptor to add auth header
    this.api.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
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
              // Refresh failed, redirect to login
              this.logout();
              window.location.href = '/login';
              return Promise.reject(refreshError);
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('accessToken', token);
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('accessToken');
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/login', credentials);
      this.setAccessToken(response.data.accessToken);
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
      console.error('Logout error:', error);
    } finally {
      this.setAccessToken(null);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.api.get('/api/auth/me');
      return response.data.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get user');
    }
  }

  async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.api
      .post<AuthResponse>('/api/auth/refresh')
      .then((response) => {
        this.setAccessToken(response.data.accessToken);
        this.refreshPromise = null;
        return response.data.accessToken;
      })
      .catch((error) => {
        this.refreshPromise = null;
        throw error;
      });

    return this.refreshPromise;
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

  // Google OAuth
  initiateGoogleLogin() {
    window.location.href = `${API_URL}/api/auth/google`;
  }

  async handleGoogleCallback(token: string): Promise<void> {
    this.setAccessToken(token);
  }

  // Get API instance for other requests
  getApiInstance(): AxiosInstance {
    return this.api;
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;
