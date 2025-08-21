export interface TokenStorage {
    getToken(): Promise<string | null>;
    setToken(token: string): Promise<void>;
    removeToken(): Promise<void>;
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}
export declare class WebTokenStorage implements TokenStorage {
    getToken(): Promise<string | null>;
    setToken(token: string): Promise<void>;
    removeToken(): Promise<void>;
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}
export declare class MobileTokenStorage implements TokenStorage {
    private preferences;
    constructor();
    private getCapacitorPreferences;
    getToken(): Promise<string | null>;
    setToken(token: string): Promise<void>;
    removeToken(): Promise<void>;
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}
export declare class MemoryTokenStorage implements TokenStorage {
    private storage;
    getToken(): Promise<string | null>;
    setToken(token: string): Promise<void>;
    removeToken(): Promise<void>;
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}
export declare function createTokenStorage(): TokenStorage;
