export interface LoginCredentials {
    username: string;
    password: string;
}
export interface RegisterData {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: string;
    securityQuestion?: string;
    securityAnswer?: string;
    roleName?: string;
}
export interface User {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    emailVerified?: boolean;
    lastLoginAt?: string;
}
export interface AuthResponse {
    token?: string;
    accessToken?: string;
    user: User;
    message?: string;
}
export interface ApiError {
    error: string;
    message?: string;
}
export interface FinancialAccount {
    id: number;
    userId: number;
    name: string;
    accountType: FinancialAccountType;
    balance: number;
    currency: string;
    isLiquid: boolean;
    identifier?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    initialBalance: number;
    lastRecalculatedAt?: string;
    brokerInstitutionId?: number;
    lastStatusChange?: string;
}
export declare enum FinancialAccountType {
    FX_COMMODITY = "FX_COMMODITY",
    STOCKS = "STOCKS",
    CRYPTO = "CRYPTO",
    REAL_ESTATE = "REAL_ESTATE",
    PERSONAL_EXPENSES = "PERSONAL_EXPENSES",
    BONDS = "BONDS",
    ETFS = "ETFS",
    CASH = "CASH",
    PHYSICAL_COMMODITY = "PHYSICAL_COMMODITY",
    BUSINESS = "BUSINESS",
    VEHICLE = "VEHICLE",
    OTHER = "OTHER"
}
export interface Trade {
    id: number;
    accountId: number;
    instrumentId?: number;
    instrument?: string;
    patternId?: number;
    pattern?: string;
    tradeType: TradeType;
    tradeDirection?: TradeDirection;
    status: TradeStatus;
    fees: number;
    entryDate?: string;
    exitDate?: string;
    amount?: number;
    notes?: string;
    realizedPL?: number;
    openingBalance?: number;
    closingBalance?: number;
    createdAt: string;
    updatedAt: string;
    media?: any;
}
export declare enum TradeType {
    FX = "FX",
    STOCK = "STOCK",
    BOND = "BOND",
    CRYPTO = "CRYPTO",
    ETF = "ETF",
    OTHER = "OTHER"
}
export declare enum TradeDirection {
    LONG = "LONG",
    SHORT = "SHORT"
}
export declare enum TradeStatus {
    OPEN = "OPEN",
    CLOSED = "CLOSED",
    CANCELLED = "CANCELLED"
}
export interface Transaction {
    id: number;
    fromAccountId?: number;
    toAccountId?: number;
    balanceImpact?: number;
    type: TransactionType;
    amount: number;
    dateTime: string;
    currency: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}
export declare enum TransactionType {
    DEPOSIT = "DEPOSIT",
    WITHDRAW = "WITHDRAW",
    TRANSFER = "TRANSFER",
    DIVIDEND = "DIVIDEND",
    TRADE_PNL = "TRADE_PNL"
}
export interface Platform {
    isWeb: boolean;
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isCapacitor: boolean;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface ApiConfig {
    baseURL: string;
    timeout?: number;
    retryAttempts?: number;
}
