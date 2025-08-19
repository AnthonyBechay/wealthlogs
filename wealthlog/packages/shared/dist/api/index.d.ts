import { TokenStorage } from '../storage/index';
import { LoginCredentials, RegisterData, AuthResponse, User, FinancialAccount, Trade, Transaction, PaginatedResponse, ApiConfig } from '../types/index';
export declare class WealthLogAPI {
    private api;
    private tokenStorage;
    private currentToken;
    constructor(config: ApiConfig, tokenStorage?: TokenStorage);
    private initializeToken;
    private setupInterceptors;
    private updateAuthHeader;
    private setToken;
    private clearToken;
    login(credentials: LoginCredentials): Promise<AuthResponse>;
    register(data: RegisterData): Promise<{
        message: string;
        userId: number;
    }>;
    logout(): Promise<void>;
    getCurrentUser(): Promise<User>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, password: string): Promise<{
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    getAccounts(): Promise<FinancialAccount[]>;
    getAccount(id: number): Promise<FinancialAccount>;
    createAccount(account: Partial<FinancialAccount>): Promise<FinancialAccount>;
    updateAccount(id: number, updates: Partial<FinancialAccount>): Promise<FinancialAccount>;
    deleteAccount(id: number): Promise<void>;
    getTrades(accountId?: number, params?: Record<string, any>): Promise<PaginatedResponse<Trade>>;
    getTrade(id: number): Promise<Trade>;
    createTrade(trade: Partial<Trade>): Promise<Trade>;
    updateTrade(id: number, updates: Partial<Trade>): Promise<Trade>;
    deleteTrade(id: number): Promise<void>;
    getTransactions(accountId?: number, params?: Record<string, any>): Promise<PaginatedResponse<Transaction>>;
    createTransaction(transaction: Partial<Transaction>): Promise<Transaction>;
    getDashboard(): Promise<any>;
    isAuthenticated(): boolean;
    getToken(): string | null;
    uploadFile(endpoint: string, file: File | Blob, fileName?: string): Promise<any>;
}
export declare function createWealthLogAPI(baseURL?: string, tokenStorage?: TokenStorage): WealthLogAPI;
export declare function getPlatform(): {
    isWeb: boolean;
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isCapacitor: boolean;
};
