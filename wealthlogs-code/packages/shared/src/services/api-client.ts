/**
 * Simple API Client with basic security and error handling
 * Works for both web and mobile (Capacitor)
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

export interface ApiConfig {
  baseURL: string;
  timeout?: number;
  withCredentials?: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

// Type for error response data
interface ErrorResponseData {
  code?: string;
  message?: string;
  details?: any;
  error?: string;
}

/**
 * Simple API client with token management
 */
export class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor(config: ApiConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      withCredentials: config.withCredentials !== false,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError<ErrorResponseData>) => {
        const apiError: ApiError = {
          code: error.response?.data?.code || 'UNKNOWN_ERROR',
          message: error.response?.data?.message || error.response?.data?.error || error.message || 'An error occurred',
          statusCode: error.response?.status || 500,
          details: error.response?.data?.details,
        };
        return Promise.reject(apiError);
      }
    );
  }

  setToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete(url, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.patch(url, data, config);
  }
}

/**
 * Create an API client instance
 */
export function createApiClient(config: ApiConfig): ApiClient {
  return new ApiClient(config);
}

export default ApiClient;
