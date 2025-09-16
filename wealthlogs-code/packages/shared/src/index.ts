// Main exports for @wealthlog/shared package

// Export API utilities
export * from './api/index';
export * from './storage/index';
export * from './types/index';

// Export services
export * from './services/security';
export * from './services/api-client';
export * from './services/error-handler';
export * from './services/monitoring';
export * from './services/data-validator';

// Re-export commonly used utilities
export { createWealthLogAPI, WealthLogAPI, getPlatform } from './api/index';
export { createTokenStorage, WebTokenStorage, MobileTokenStorage, MemoryTokenStorage } from './storage/index';
export type { TokenStorage } from './storage/index';
export type { 
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

// Export API client utilities
export { 
  ApiClient,
  createApiClient,
  type ApiConfig as ApiClientConfig,  // Alias for backward compatibility
  type ApiError
} from './services/api-client';

// Export security utilities
export { 
  SecurityService, 
  SecureStorage, 
  CSRFProtection, 
  RateLimiter 
} from './services/security';

// Export error handling
export {
  AppError,
  ErrorCode,
  ErrorFactory,
  RetryHandler,
  type ErrorCodeType
} from './services/error-handler';

// Export monitoring utilities
export {
  Logger,
  LogLevel,
  MetricsCollector,
  PerformanceMonitor,
  logger,
  metrics,
  performanceMonitor as performance
} from './services/monitoring';

// Export validation utilities
export {
  DataValidator,
  ValidationSchemas,
  FieldValidators,
  type ValidationRule,
  type ValidationSchema,
  type ValidationResult
} from './services/data-validator';
