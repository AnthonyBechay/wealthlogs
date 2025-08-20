/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Trade" ALTER COLUMN "status" SET DEFAULT 'CLOSED';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "googleId" TEXT;

-- CreateTable
CREATE TABLE "public"."RefreshToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "public"."RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "public"."RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "public"."RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "public"."RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "public"."Expense"("userId");

-- CreateIndex
CREATE INDEX "Expense_expenseCategoryId_idx" ON "public"."Expense"("expenseCategoryId");

-- CreateIndex
CREATE INDEX "Expense_userId_date_idx" ON "public"."Expense"("userId", "date");

-- CreateIndex
CREATE INDEX "FinancialAccount_userId_idx" ON "public"."FinancialAccount"("userId");

-- CreateIndex
CREATE INDEX "FinancialAccount_active_idx" ON "public"."FinancialAccount"("active");

-- CreateIndex
CREATE INDEX "FinancialAccount_createdAt_idx" ON "public"."FinancialAccount"("createdAt");

-- CreateIndex
CREATE INDEX "FinancialAccount_userId_active_idx" ON "public"."FinancialAccount"("userId", "active");

-- CreateIndex
CREATE INDEX "FinancialAccount_userId_createdAt_idx" ON "public"."FinancialAccount"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Label_userId_name_idx" ON "public"."Label"("userId", "name");

-- CreateIndex
CREATE INDEX "Trade_accountId_idx" ON "public"."Trade"("accountId");

-- CreateIndex
CREATE INDEX "Trade_tradeType_idx" ON "public"."Trade"("tradeType");

-- CreateIndex
CREATE INDEX "Trade_instrumentId_idx" ON "public"."Trade"("instrumentId");

-- CreateIndex
CREATE INDEX "Trade_patternId_idx" ON "public"."Trade"("patternId");

-- CreateIndex
CREATE INDEX "Trade_accountId_entryDate_idx" ON "public"."Trade"("accountId", "entryDate");

-- CreateIndex
CREATE INDEX "Trade_accountId_tradeType_entryDate_idx" ON "public"."Trade"("accountId", "tradeType", "entryDate");

-- CreateIndex
CREATE INDEX "TradeMedia_tradeId_idx" ON "public"."TradeMedia"("tradeId");

-- CreateIndex
CREATE INDEX "TradeMedia_labelId_idx" ON "public"."TradeMedia"("labelId");

-- CreateIndex
CREATE INDEX "Transaction_fromAccountId_dateTime_idx" ON "public"."Transaction"("fromAccountId", "dateTime");

-- CreateIndex
CREATE INDEX "Transaction_toAccountId_dateTime_idx" ON "public"."Transaction"("toAccountId", "dateTime");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "public"."User"("googleId");

-- CreateIndex
CREATE INDEX "status_history_accountId_idx" ON "public"."status_history"("accountId");

-- CreateIndex
CREATE INDEX "status_history_changedAt_idx" ON "public"."status_history"("changedAt");

-- CreateIndex
CREATE INDEX "status_history_accountId_changedAt_idx" ON "public"."status_history"("accountId", "changedAt");

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
