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
        this.tokenStorage = tokenStorage || (0, index_1.createTokenStorage)();
        this.api = axios_1.default.create({
            baseURL: config.baseURL,
            timeout: config.timeout || 30000,
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
        // Response interceptor
        this.api.interceptors.response.use((response) => response, async (error) => {
            if (error.response?.status === 401) {
                // Token expired or invalid
                await this.clearToken();
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
    // Auth methods
    async login(credentials) {
        try {
            const response = await this.api.post('/auth/login', credentials);
            await this.setToken(response.data.token);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Login failed');
        }
    }
    async register(data) {
        try {
            const response = await this.api.post('/auth/register', data);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Registration failed');
        }
    }
    async logout() {
        try {
            await this.api.post('/auth/logout');
        }
        catch (error) {
            // Logout should always clear local token even if server call fails
            console.warn('Logout API call failed:', error);
        }
        finally {
            await this.clearToken();
        }
    }
    async getCurrentUser() {
        try {
            const response = await this.api.get('/auth/me');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get current user');
        }
    }
    async forgotPassword(email) {
        try {
            const response = await this.api.post('/auth/forgot-password', { email });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Password reset request failed');
        }
    }
    async resetPassword(token, password) {
        try {
            const response = await this.api.post('/auth/reset-password', { token, password });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Password reset failed');
        }
    }
    async verifyEmail(token) {
        try {
            const response = await this.api.get(`/auth/verify-email?token=${token}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Email verification failed');
        }
    }
    // Financial Account methods
    async getAccounts() {
        try {
            const response = await this.api.get('/account');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get accounts');
        }
    }
    async getAccount(id) {
        try {
            const response = await this.api.get(`/account/${id}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get account');
        }
    }
    async createAccount(account) {
        try {
            const response = await this.api.post('/account', account);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to create account');
        }
    }
    async updateAccount(id, updates) {
        try {
            const response = await this.api.put(`/account/${id}`, updates);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to update account');
        }
    }
    async deleteAccount(id) {
        try {
            await this.api.delete(`/account/${id}`);
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to delete account');
        }
    }
    // Trade methods
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
            const response = await this.api.get(`/trade?${queryParams.toString()}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get trades');
        }
    }
    async getTrade(id) {
        try {
            const response = await this.api.get(`/trade/${id}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get trade');
        }
    }
    async createTrade(trade) {
        try {
            const response = await this.api.post('/trade', trade);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to create trade');
        }
    }
    async updateTrade(id, updates) {
        try {
            const response = await this.api.put(`/trade/${id}`, updates);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to update trade');
        }
    }
    async deleteTrade(id) {
        try {
            await this.api.delete(`/trade/${id}`);
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to delete trade');
        }
    }
    // Transaction methods
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
            const response = await this.api.get(`/transactions?${queryParams.toString()}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get transactions');
        }
    }
    async createTransaction(transaction) {
        try {
            const response = await this.api.post('/transactions', transaction);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to create transaction');
        }
    }
    // Dashboard methods
    async getDashboard() {
        try {
            const response = await this.api.get('/dashboard');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to get dashboard data');
        }
    }
    // Utility methods
    isAuthenticated() {
        return !!this.currentToken;
    }
    getToken() {
        return this.currentToken;
    }
    // File upload method (for mobile/web compatibility)
    async uploadFile(endpoint, file, fileName) {
        try {
            const formData = new FormData();
            if (file instanceof File) {
                formData.append('file', file);
            }
            else {
                // Handle Blob (could be from mobile camera)
                formData.append('file', file, fileName || 'upload.jpg');
            }
            const response = await this.api.post(endpoint, formData, {
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
        baseURL: baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
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
