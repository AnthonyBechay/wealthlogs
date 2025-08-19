"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryTokenStorage = exports.MobileTokenStorage = exports.WebTokenStorage = void 0;
exports.createTokenStorage = createTokenStorage;
// Web implementation using localStorage
class WebTokenStorage {
    async getToken() {
        return this.getItem('accessToken');
    }
    async setToken(token) {
        return this.setItem('accessToken', token);
    }
    async removeToken() {
        return this.removeItem('accessToken');
    }
    async getItem(key) {
        if (typeof window === 'undefined') {
            return null;
        }
        return localStorage.getItem(key);
    }
    async setItem(key, value) {
        if (typeof window === 'undefined') {
            return;
        }
        localStorage.setItem(key, value);
    }
    async removeItem(key) {
        if (typeof window === 'undefined') {
            return;
        }
        localStorage.removeItem(key);
    }
}
exports.WebTokenStorage = WebTokenStorage;
// Mobile implementation using Capacitor Preferences
class MobileTokenStorage {
    constructor() {
        this.preferences = null;
        // Capacitor will be available at runtime, not build time
    }
    getCapacitorPreferences() {
        // Only try to access Capacitor at runtime
        if (typeof window !== 'undefined' && window.Capacitor) {
            // Try different ways Capacitor exposes Preferences
            const cap = window.Capacitor;
            return cap.Plugins?.Preferences || cap.Preferences;
        }
        return null;
    }
    async getToken() {
        return this.getItem('accessToken');
    }
    async setToken(token) {
        return this.setItem('accessToken', token);
    }
    async removeToken() {
        return this.removeItem('accessToken');
    }
    async getItem(key) {
        const preferences = this.getCapacitorPreferences();
        if (!preferences) {
            console.warn('Capacitor Preferences not available');
            return null;
        }
        try {
            const result = await preferences.get({ key });
            return result.value || null;
        }
        catch (error) {
            console.error('Error getting item from preferences:', error);
            return null;
        }
    }
    async setItem(key, value) {
        const preferences = this.getCapacitorPreferences();
        if (!preferences) {
            console.warn('Capacitor Preferences not available');
            return;
        }
        try {
            await preferences.set({ key, value });
        }
        catch (error) {
            console.error('Error setting item in preferences:', error);
        }
    }
    async removeItem(key) {
        const preferences = this.getCapacitorPreferences();
        if (!preferences) {
            console.warn('Capacitor Preferences not available');
            return;
        }
        try {
            await preferences.remove({ key });
        }
        catch (error) {
            console.error('Error removing item from preferences:', error);
        }
    }
}
exports.MobileTokenStorage = MobileTokenStorage;
// Memory storage fallback for SSR or testing
class MemoryTokenStorage {
    constructor() {
        this.storage = new Map();
    }
    async getToken() {
        return this.getItem('accessToken');
    }
    async setToken(token) {
        return this.setItem('accessToken', token);
    }
    async removeToken() {
        return this.removeItem('accessToken');
    }
    async getItem(key) {
        return this.storage.get(key) || null;
    }
    async setItem(key, value) {
        this.storage.set(key, value);
    }
    async removeItem(key) {
        this.storage.delete(key);
    }
}
exports.MemoryTokenStorage = MemoryTokenStorage;
// Factory function to create the appropriate storage
function createTokenStorage() {
    // Check if we're in a mobile environment (Capacitor)
    if (typeof window !== 'undefined' && window.Capacitor) {
        return new MobileTokenStorage();
    }
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
        return new WebTokenStorage();
    }
    // Fallback to memory storage (SSR, testing, etc.)
    return new MemoryTokenStorage();
}
