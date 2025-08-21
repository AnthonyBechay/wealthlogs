// API client singleton for the web app
import { createWealthLogAPI, WealthLogAPI } from '@wealthlog/shared';

// Create and export a singleton API instance
let apiInstance: WealthLogAPI | null = null;

export function getApiClient(): WealthLogAPI {
  if (!apiInstance) {
    apiInstance = createWealthLogAPI(
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    );
  }
  return apiInstance;
}

// Export as default for convenience
export const api = getApiClient();

// Re-export types from shared for convenience
export type { 
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  FinancialAccount,
  Trade,
  Transaction
} from '@wealthlog/shared';
