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
  private preferences: any;

  constructor() {
    // Dynamic import to avoid issues when not available
    this.initPreferences();
  }

  private async initPreferences() {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      this.preferences = Preferences;
    } catch (error) {
      console.warn('Capacitor Preferences not available, falling back to memory storage');
      this.preferences = null;
    }
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
    if (!this.preferences) {
      await this.initPreferences();
    }
    
    if (!this.preferences) {
      return null;
    }
    
    try {
      const { value } = await this.preferences.get({ key });
      return value;
    } catch (error) {
      console.error('Error getting item from preferences:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.preferences) {
      await this.initPreferences();
    }
    
    if (!this.preferences) {
      return;
    }
    
    try {
      await this.preferences.set({ key, value });
    } catch (error) {
      console.error('Error setting item in preferences:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.preferences) {
      await this.initPreferences();
    }
    
    if (!this.preferences) {
      return;
    }
    
    try {
      await this.preferences.remove({ key });
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
