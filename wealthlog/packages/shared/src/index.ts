// Main exports for @wealthlog/shared package
export * from './api/index';
export * from './storage/index';
export * from './types/index';

// Re-export commonly used utilities
export { createWealthLogAPI, WealthLogAPI, getPlatform } from './api/index';
export { createTokenStorage, WebTokenStorage, MobileTokenStorage, MemoryTokenStorage } from './storage/index';
export type { 
  TokenStorage,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  FinancialAccount,
  Trade,
  Transaction,
  ApiConfig,
  Platform
} from './types/index';
