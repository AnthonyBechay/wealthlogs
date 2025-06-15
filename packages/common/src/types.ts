// packages/common/src/types.ts

// From Prisma Schema (as string literal unions for wider JS/TS compatibility)
export type FinancialAccountType =
  | "FX_COMMODITY"
  | "STOCKS"
  | "CRYPTO"
  | "REAL_ESTATE"
  | "PERSONAL_EXPENSES"
  | "BONDS"
  | "ETFs"
  | "CASH"
  | "PHYSICAL_COMMODITY"
  | "BUSINESS"
  | "VEHICLE"
  | "OTHER";

export type TradeType =
  | "FX"
  | "STOCK"
  | "BOND"
  | "CRYPTO"
  | "ETF"
  | "OTHER";

export type TradeDirection =
  | "LONG"
  | "SHORT";

export type TradeStatus =
  | "OPEN"
  | "CLOSED"
  | "CANCELLED";

export type TransactionTypeValue = // Renamed to avoid conflict if 'TransactionType' interface is made
  | "DEPOSIT"
  | "WITHDRAW"
  | "TRANSFER"
  | "DIVIDEND"
  | "TRADE_PNL"; // As per Prisma schema

// From wealthlog/apps/web/pages/accounts.tsx
export type StatusChangeReason =
  | "ACCOUNT_CLOSED"
  | "MAINTENANCE"
  | "SUSPENDED"
  | "REACTIVATED"
  | "ARCHIVED"
  | "MANUAL";

// Add other simple shared types if any are immediately obvious from accounts.tsx
export type LoadingState = "idle" | "loading" | "error" | "success";

// It's good practice to also export Prisma's generated types if you plan to use them directly
// in the frontend, but that requires a build step for the common package or type duplication.
// For now, we are manually defining shared types.

export interface BrokerInstitution { // If simple, or define more fully if needed
  id: number;
  name: string;
}

export interface FinancialAccount {
  id: number;
  userId: number; // From trading.tsx and Prisma model
  name: string;
  accountType: FinancialAccountType; // Shared type
  balance: number;
  currency: string;
  isLiquid: boolean; // From Prisma model
  active: boolean;
  identifier?: string | null; // From Prisma model
  brokerInstitutionId?: number | null; // From Prisma model
  // brokerInstitution?: BrokerInstitution | null; // Relation, keep it simple for now unless frontend explicitly needs nested object
  initialBalance: number; // From trading.tsx (default in Prisma is 0)
  lastRecalculatedAt?: string | null; // From Prisma model (DateTime as string)
  createdAt: string; // From Prisma model (DateTime as string)
  updatedAt: string; // From Prisma model (DateTime as string)

  // Frontend specific, added in accounts.tsx for UI state
  statusHistory?: AccountStatusHistoryItem[]; // Define AccountStatusHistoryItem next
  lastStatusChange?: string | null; // From accounts.tsx
}

// Placeholder for AccountStatusHistoryItem, will be fully defined later
// For now, this makes FinancialAccount complete.
export interface AccountStatusHistoryItem {
  id: number;
  // ... other fields will be added
}
