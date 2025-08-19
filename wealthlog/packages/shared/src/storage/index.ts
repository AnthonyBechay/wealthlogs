// Storage interface that works across platforms
export interface TokenStorage {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  removeToken(): Promise<void>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Web implementation using localStorage
export class WebTokenStorage implements TokenStorage {
  async getToken(): Promise<string | null> {
    return this.getItem('accessToken');
  }

  async setToken(token: string): Promise<void> {
    return this.setItem('accessToken', token);
  }

  async removeToken(): Promise<void> {
    return this.removeItem('accessToken');
  }

  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem(key);
  }
}

// Mobile implementation using Capacitor Preferences
export class MobileTokenStorage implements TokenStorage {
  private preferences: any = null;

  constructor() {
    // Capacitor will be available at runtime, not build time
  }

  private getCapacitorPreferences() {
    // Only try to access Capacitor at runtime
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      // Try different ways Capacitor exposes Preferences
      const cap = (window as any).Capacitor;
      return cap.Plugins?.Preferences || cap.Preferences;
    }
    return null;
  }

  async getToken(): Promise<string | null> {
    return this.getItem('accessToken');
  }

  async setToken(token: string): Promise<void> {
    return this.setItem('accessToken', token);
  }

  async removeToken(): Promise<void> {
    return this.removeItem('accessToken');
  }

  async getItem(key: string): Promise<string | null> {
    const preferences = this.getCapacitorPreferences();
    
    if (!preferences) {
      console.warn('Capacitor Preferences not available');
      return null;
    }
    
    try {
      const result = await preferences.get({ key });
      return result.value || null;
    } catch (error) {
      console.error('Error getting item from preferences:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const preferences = this.getCapacitorPreferences();
    
    if (!preferences) {
      console.warn('Capacitor Preferences not available');
      return;
    }
    
    try {
      await preferences.set({ key, value });
    } catch (error) {
      console.error('Error setting item in preferences:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    const preferences = this.getCapacitorPreferences();
    
    if (!preferences) {
      console.warn('Capacitor Preferences not available');
      return;
    }
    
    try {
      await preferences.remove({ key });
    } catch (error) {
      console.error('Error removing item from preferences:', error);
    }
  }
}

// Memory storage fallback for SSR or testing
export class MemoryTokenStorage implements TokenStorage {
  private storage = new Map<string, string>();

  async getToken(): Promise<string | null> {
    return this.getItem('accessToken');
  }

  async setToken(token: string): Promise<void> {
    return this.setItem('accessToken', token);
  }

  async removeToken(): Promise<void> {
    return this.removeItem('accessToken');
  }

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }
}

// Factory function to create the appropriate storage
export function createTokenStorage(): TokenStorage {
  // Check if we're in a mobile environment (Capacitor)
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return new MobileTokenStorage();
  }
  
  // Check if we're in a browser environment
  if (typeof window !== 'undefined' && window.localStorage) {
    return new WebTokenStorage();
  }
  
  // Fallback to memory storage (SSR, testing, etc.)
  return new MemoryTokenStorage();
}
