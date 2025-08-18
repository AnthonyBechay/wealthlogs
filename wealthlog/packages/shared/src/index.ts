// Main exports for @wealthlog/shared package
export * from './api/index.js';
export * from './storage/index.js';
export * from './types/index.js';

// Re-export commonly used utilities
export { createWealthLogAPI, WealthLogAPI, getPlatform } from './api/index.js';
export { createTokenStorage, WebTokenStorage, MobileTokenStorage, MemoryTokenStorage } from './storage/index.js';
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
} from './types/index.js';
