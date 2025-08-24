/**
 * Enhanced API Client
 * Robust API client with retry logic, caching, and error handling
 * Works seamlessly across web and mobile platforms
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { AppError, ErrorHandler, RetryHandler, CircuitBreaker } from './error-handler';
import { CSRFProtection, RateLimiter } from './security';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableCache?: boolean;
  enableCircuitBreaker?: boolean;
  enableRateLimiting?: boolean;
  rateLimitMax?: number;
  rateLimitWindow?: number;
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export interface RequestOptions extends AxiosRequestConfig {
  skipAuth?: boolean;
  cacheTTL?: number;
  skipCache?: boolean;
  retryable?: boolean;
  customHeaders?: Record<string, string>;
}

/**
 * Advanced API Client with enterprise features
 */
export class ApiClient {
  private client: AxiosInstance;
  private cache: Map<string, CacheEntry> = new Map();
  private circuitBreaker?: CircuitBreaker;
  private rateLimiter?: RateLimiter;
  private accessToken?: string;
  private refreshToken?: string;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor(private config: ApiClientConfig) {
    // Initialize axios instance
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // For cookies
    });

    // Initialize optional features
    if (config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker();
    }

    if (config.enableRateLimiting) {
      this.rateLimiter = new RateLimiter(
        config.rateLimitMax || 100,
        config.rateLimitWindow || 60000
      );
    }

    // Setup interceptors
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();

    // Start cache cleanup
    if (config.enableCache) {
      this.startCacheCleanup();
    }
  }

  /**
   * Setup request interceptor
   */
  private setupRequestInterceptor() {
    this.client.interceptors.request.use(
      async (config) => {
        // Add auth token
        if (!config.headers['skipAuth'] && this.accessToken) {
          config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        // Add CSRF token
        const csrfToken = CSRFProtection.getToken();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }

        // Check rate limiting
        if (this.rateLimiter && !this.rateLimiter.isAllowed('global')) {
          throw new AppError({
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            statusCode: 429,
          });
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Setup response interceptor
   */
  private setupResponseInterceptor() {
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle 401 and token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.refreshToken) {
            originalRequest._retry = true;
            
            if (!this.isRefreshing) {
              this.isRefreshing = true;
              
              try {
                const newToken = await this.refreshAccessToken();
                this.onTokenRefreshed(newToken);
                this.isRefreshing = false;
              } catch (refreshError) {
                this.isRefreshing = false;
                this.handleAuthError();
                return Promise.reject(refreshError);
              }
            }

            // Wait for token refresh
            return new Promise((resolve) => {
              this.subscribeTokenRefresh((token: string) => {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          } else {
            this.handleAuthError();
          }
        }

        // Convert to AppError
        const appError = ErrorHandler.handleApiError(error.response || error);
        return Promise.reject(appError);
      }
    );
  }

  /**
   * Set authentication tokens
   */
  setTokens(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.cache.clear();
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, options?: RequestOptions): Promise<T> {
    // Check cache first
    if (this.config.enableCache && !options?.skipCache) {
      const cached = this.getFromCache(url);
      if (cached) return cached;
    }

    const response = await this.executeRequest<T>(() => 
      this.client.get<T>(url, options),
      options
    );

    // Cache successful GET requests
    if (this.config.enableCache && options?.cacheTTL) {
      this.addToCache(url, response, options.cacheTTL);
    }

    return response;
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.executeRequest<T>(() => 
      this.client.post<T>(url, data, options),
      options
    );
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.executeRequest<T>(() => 
      this.client.put<T>(url, data, options),
      options
    );
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.executeRequest<T>(() => 
      this.client.patch<T>(url, data, options),
      options
    );
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.executeRequest<T>(() => 
      this.client.delete<T>(url, options),
      options
    );
  }

  /**
   * Execute request with retry and circuit breaker
   */
  private async executeRequest<T>(
    request: () => Promise<AxiosResponse<T>>,
    options?: RequestOptions
  ): Promise<T> {
    const execute = async () => {
      if (this.circuitBreaker) {
        return this.circuitBreaker.execute(request);
      }
      return request();
    };

    let response: AxiosResponse<T>;

    if (options?.retryable !== false) {
      response = await RetryHandler.withRetry(
        execute,
        {
          maxAttempts: this.config.retryAttempts || 3,
          delay: this.config.retryDelay || 1000,
          shouldRetry: (error) => {
            // Retry on network errors and 5xx errors
            return !error.response || error.response.status >= 500;
          },
        }
      );
    } else {
      response = await execute();
    }

    return response.data;
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<string> {
    const response = await this.client.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken: this.refreshToken,
    });
    
    this.accessToken = response.data.accessToken;
    return response.data.accessToken;
  }

  /**
   * Handle authentication error
   */
  private handleAuthError() {
    this.clearAuth();
    // Redirect to login or emit event
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  /**
   * Subscribe to token refresh
   */
  private subscribeTokenRefresh(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  /**
   * Notify subscribers of token refresh
   */
  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private addToCache(key: string, data: any, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(
    url: string,
    file: File | Blob,
    onProgress?: (progress: number) => void,
    options?: RequestOptions
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post(url, formData, {
      ...options,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...options?.customHeaders,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    }).then(response => response.data);
  }

  /**
   * Download file
   */
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
    });

    // Create download link
    const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  /**
   * Batch requests
   */
  async batch<T = any>(requests: Array<() => Promise<any>>): Promise<T[]> {
    return Promise.all(requests.map(req => this.executeRequest(req)));
  }
}

/**
 * Singleton API client instance
 */
let apiClientInstance: ApiClient | null = null;

export function createApiClient(config: ApiClientConfig): ApiClient {
  apiClientInstance = new ApiClient(config);
  return apiClientInstance;
}

export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    throw new Error('API client not initialized. Call createApiClient first.');
  }
  return apiClientInstance;
}

export default {
  ApiClient,
  createApiClient,
  getApiClient,
};
