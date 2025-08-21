import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { TokenStorage } from '../storage/index';
import { LoginCredentials, RegisterData, AuthResponse, User, FinancialAccount, Trade, Transaction, PaginatedResponse, ApiConfig } from '../types/index';
export declare class WealthLogAPI {
    private api;
    private tokenStorage;
    private currentToken;
    private refreshPromise;
    constructor(config: ApiConfig, tokenStorage?: TokenStorage);
    private initializeToken;
    private setupInterceptors;
    private updateAuthHeader;
    private setToken;
    private clearToken;
    private refreshAccessToken;
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
    deleteAccount(id: number, cascade?: boolean): Promise<void>;
    getTrades(accountId?: number, params?: Record<string, any>): Promise<PaginatedResponse<Trade>>;
    getTrade(id: number): Promise<Trade>;
    createTrade(trade: Partial<Trade>): Promise<Trade>;
    updateTrade(id: number, updates: Partial<Trade>): Promise<Trade>;
    deleteTrade(id: number): Promise<void>;
    getTransactions(accountId?: number, params?: Record<string, any>): Promise<PaginatedResponse<Transaction>>;
    createTransaction(transaction: Partial<Transaction>): Promise<Transaction>;
    getDashboard(range?: string): Promise<any>;
    getDashboardSummary(): Promise<any>;
    getTradingSettings(): Promise<any>;
    updateTradingSettings(settings: any): Promise<any>;
    getGeneralSettings(): Promise<any>;
    updateGeneralSettings(settings: any): Promise<any>;
    getRealEstateProperties(): Promise<any[]>;
    createRealEstateProperty(property: any): Promise<any>;
    updateRealEstateProperty(id: number, updates: any): Promise<any>;
    deleteRealEstateProperty(id: number): Promise<void>;
    getRealEstateExpenses(): Promise<any[]>;
    createRealEstateExpense(expense: any): Promise<any>;
    getAdminRoles(): Promise<any[]>;
    addUserRole(userId: number, roleId: number): Promise<any>;
    getAccountStatusHistory(): Promise<any[]>;
    updateAccountStatus(accountId: number, status: {
        active: boolean;
        reason?: string;
        comment?: string;
    }): Promise<any>;
    isAuthenticated(): boolean;
    getToken(): string | null;
    getApiInstance(): AxiosInstance;
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
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
