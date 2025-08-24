"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WealthLogAPI = void 0;
exports.createWealthLogAPI = createWealthLogAPI;
exports.getPlatform = getPlatform;
const axios_1 = __importDefault(require("axios"));
const index_1 = require("../storage/index");
class WealthLogAPI {
    constructor(config, tokenStorage) {
        this.currentToken = null;
        this.refreshPromise = null;
        this.tokenStorage = tokenStorage || (0, index_1.createTokenStorage)();
        this.api = axios_1.default.create({
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
    async initializeToken() {
        try {
            this.currentToken = await this.tokenStorage.getToken();
            if (this.currentToken) {
                this.updateAuthHeader(this.currentToken);
            }
        }
        catch (error) {
            console.warn('Failed to initialize token:', error);
        }
    }
    setupInterceptors() {
        // Request interceptor
        this.api.interceptors.request.use((config) => {
            if (this.currentToken && config.headers) {
                config.headers.Authorization = `Bearer ${this.currentToken}`;
            }
            return config;
        }, (error) => Promise.reject(error));
        // Response interceptor for token refresh
        this.api.interceptors.response.use((response) => response, async (error) => {
            const originalRequest = error.config;
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                // Check if it's a token expired error
                if (error.response?.data?.code === 'TOKEN_EXPIRED') {
                    try {
                        const newToken = await this.refreshAccessToken();
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return this.api(originalRequest);
                    }
                    catch (refreshError) {
                        // Refresh failed, clear token
                        await this.clearToken();
                        return Promise.reject(refreshError);
                    }
                }
            }
            return Promise.reject(error);
        });
    }
    updateAuthHeader(token) {
        this.api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
    async setToken(token) {
        this.currentToken = token;
        this.updateAuthHeader(token);
        await this.tokenStorage.setToken(token);
    }
    async clearToken() {
        this.currentToken = null;
        delete this.api.defaults.headers.common.Authorization;
        await this.tokenStorage.removeToken();
    }
    async refreshAccessToken() {
        // Prevent multiple simultaneous refresh requests
        if (this.refreshPromise) {
            return this.refreshPromise;
        }
        this.refreshPromise = this.api
            .post('/api/auth/refresh')
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
    async login(credentials) {
        try {
            const response = await this.api.post('/api/auth/login', credentials);
            const token = response.data.accessToken || response.data.token;
            if (token) {
                await this.setToken(token);
            }
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Login failed');
        }
    }
    async register(data) {
        try {
            const response = await this.api.post('/api/auth/register', data);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Registration failed');
        }
    }
    async logout() {
        try {
            await this.api.post('/api/auth/logout');
        }
        catch (error) {
            console.warn('Logout API call failed:', error);
        }
        finally {
            await this.clearToken();
        }
    }
    async getCurrentUser() {
        try {
            const response = await this.api.get('/api/auth/me');
            return response.data.user || response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get current user');
        }
    }
    async forgotPassword(email) {
        try {
            const response = await this.api.post('/api/auth/forgot-password', { email });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Password reset request failed');
        }
    }
    async resetPassword(token, password) {
        try {
            const response = await this.api.post('/api/auth/reset-password', { token, password });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Password reset failed');
        }
    }
    async verifyEmail(token) {
        try {
            const response = await this.api.get(`/api/auth/verify-email?token=${token}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Email verification failed');
        }
    }
    // Financial Account methods - ALL should use /api prefix
    async getAccounts() {
        try {
            const response = await this.api.get('/api/account');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get accounts');
        }
    }
    async getAccount(id) {
        try {
            const response = await this.api.get(`/api/account/${id}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get account');
        }
    }
    async createAccount(account) {
        try {
            const response = await this.api.post('/api/account', account);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to create account');
        }
    }
    async updateAccount(id, updates) {
        try {
            const response = await this.api.put(`/api/account/${id}`, updates);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to update account');
        }
    }
    async deleteAccount(id, cascade) {
        try {
            const url = cascade !== undefined
                ? `/api/account/${id}?cascade=${cascade}`
                : `/api/account/${id}`;
            await this.api.delete(url);
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to delete account');
        }
    }
    // Trade methods - ALL should use /api prefix
    async getTrades(accountId, params) {
        try {
            const queryParams = new URLSearchParams();
            if (accountId)
                queryParams.append('accountId', accountId.toString());
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        queryParams.append(key, value.toString());
                    }
                });
            }
            const response = await this.api.get(`/api/trade?${queryParams.toString()}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get trades');
        }
    }
    async getTrade(id) {
        try {
            const response = await this.api.get(`/api/trade/${id}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get trade');
        }
    }
    async createTrade(trade) {
        try {
            const response = await this.api.post('/api/trade', trade);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to create trade');
        }
    }
    async updateTrade(id, updates) {
        try {
            const response = await this.api.put(`/api/trade/${id}`, updates);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to update trade');
        }
    }
    async deleteTrade(id) {
        try {
            await this.api.delete(`/api/trade/${id}`);
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to delete trade');
        }
    }
    // Transaction methods - ALL should use /api prefix
    async getTransactions(accountId, params) {
        try {
            const queryParams = new URLSearchParams();
            if (accountId)
                queryParams.append('accountId', accountId.toString());
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        queryParams.append(key, value.toString());
                    }
                });
            }
            const response = await this.api.get(`/api/transactions?${queryParams.toString()}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get transactions');
        }
    }
    async createTransaction(transaction) {
        try {
            const response = await this.api.post('/api/transactions', transaction);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to create transaction');
        }
    }
    // Dashboard methods - ALL should use /api prefix
    async getDashboard(range) {
        try {
            const url = range ? `/api/dashboard/networth?range=${range}` : '/api/dashboard/networth';
            const response = await this.api.get(url);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get dashboard data');
        }
    }
    async getDashboardSummary() {
        try {
            const response = await this.api.get('/api/dashboard/networth/summary');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get dashboard summary');
        }
    }
    // Settings methods - ALL should use /api prefix
    async getTradingSettings() {
        try {
            const response = await this.api.get('/api/tradingSettings');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get trading settings');
        }
    }
    async updateTradingSettings(settings) {
        try {
            const response = await this.api.put('/api/tradingSettings', settings);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to update trading settings');
        }
    }
    async getGeneralSettings() {
        try {
            const response = await this.api.get('/api/generalSettings');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get general settings');
        }
    }
    async updateGeneralSettings(settings) {
        try {
            const response = await this.api.put('/api/generalSettings', settings);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to update general settings');
        }
    }
    // Real Estate methods - ALL should use /api prefix
    async getRealEstateProperties() {
        try {
            const response = await this.api.get('/api/real-estate/properties');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get properties');
        }
    }
    async createRealEstateProperty(property) {
        try {
            const response = await this.api.post('/api/real-estate/properties', property);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to create property');
        }
    }
    async updateRealEstateProperty(id, updates) {
        try {
            const response = await this.api.put(`/api/real-estate/properties/${id}`, updates);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to update property');
        }
    }
    async deleteRealEstateProperty(id) {
        try {
            await this.api.delete(`/api/real-estate/properties/${id}`);
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to delete property');
        }
    }
    async getRealEstateExpenses() {
        try {
            const response = await this.api.get('/api/real-estate/expenses');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get expenses');
        }
    }
    async createRealEstateExpense(expense) {
        try {
            const response = await this.api.post('/api/real-estate/expenses', expense);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to create expense');
        }
    }
    // Admin methods - ALL should use /api prefix
    async getAdminRoles() {
        try {
            const response = await this.api.get('/api/admin/roles');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get roles');
        }
    }
    async addUserRole(userId, roleId) {
        try {
            const response = await this.api.post(`/api/admin/users/${userId}/addRole`, { roleId });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to add role');
        }
    }
    // Status History methods - ALL should use /api prefix
    async getAccountStatusHistory() {
        try {
            const response = await this.api.get('/api/account/status-history');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get status history');
        }
    }
    async updateAccountStatus(accountId, status) {
        try {
            const response = await this.api.patch(`/api/account/${accountId}/status`, status);
            return response.data;
        }
        catch (error) {
            // Fallback to simple update if new endpoint doesn't exist
            if (error.response?.status === 404) {
                const response = await this.api.patch(`/api/account/${accountId}`, { active: status.active });
                return response.data;
            }
            throw new Error(error.response?.data?.error || 'Failed to update account status');
        }
    }
    // Utility methods
    isAuthenticated() {
        return !!this.currentToken;
    }
    getToken() {
        return this.currentToken;
    }
    // Get raw axios instance for direct calls
    getApiInstance() {
        return this.api;
    }
    // Generic methods for direct API calls (backward compatibility)
    async get(url, config) {
        // Ensure /api prefix if not present
        const apiUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
        return this.api.get(apiUrl, config);
    }
    async post(url, data, config) {
        // Ensure /api prefix if not present
        const apiUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
        return this.api.post(apiUrl, data, config);
    }
    async put(url, data, config) {
        // Ensure /api prefix if not present
        const apiUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
        return this.api.put(apiUrl, data, config);
    }
    async patch(url, data, config) {
        // Ensure /api prefix if not present
        const apiUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
        return this.api.patch(apiUrl, data, config);
    }
    async delete(url, config) {
        // Ensure /api prefix if not present
        const apiUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
        return this.api.delete(apiUrl, config);
    }
    // File upload method
    async uploadFile(endpoint, file, fileName) {
        try {
            const formData = new FormData();
            if (file instanceof File) {
                formData.append('file', file);
            }
            else {
                formData.append('file', file, fileName || 'upload.jpg');
            }
            const apiUrl = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
            const response = await this.api.post(apiUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'File upload failed');
        }
    }
}
exports.WealthLogAPI = WealthLogAPI;
// Default API instance factory
function createWealthLogAPI(baseURL, tokenStorage) {
    const config = {
        baseURL: baseURL || (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL : undefined) || 'http://localhost:5000',
    };
    return new WealthLogAPI(config, tokenStorage);
}
// Platform detection utilities
function getPlatform() {
    const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
    const isIOS = isCapacitor && window.Capacitor.getPlatform() === 'ios';
    const isAndroid = isCapacitor && window.Capacitor.getPlatform() === 'android';
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
