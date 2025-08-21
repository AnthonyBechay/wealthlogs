/*
  Warnings:

  - You are about to drop the column `balanceAfterTrade` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `balanceBeforeTrade` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `dateTime` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `direction` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `percentage` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `session` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `accountBalance` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accountId` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tradeType` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('FX_COMMODITY', 'STOCKS', 'CRYPTO', 'REAL_ESTATE', 'PERSONAL_EXPENSES', 'BONDS', 'ETFs', 'CASH', 'PHYSICAL_COMMODITY', 'BUSINESS', 'VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('FX', 'STOCK', 'BOND', 'CRYPTO', 'ETF', 'OTHER');

-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'DIVIDEND', 'TRADE_PNL');

-- CreateEnum
CREATE TYPE "CommunityRole" AS ENUM ('MEMBER', 'COMMUNITY_COACH', 'COMMUNITY_MANAGER');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('READ', 'READ_WRITE');

-- CreateEnum
CREATE TYPE "ProjectionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('BORROWED', 'LENT');

-- CreateEnum
CREATE TYPE "RecurringEntryType" AS ENUM ('INCOME', 'EXPENSE');

-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_userId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "defaultExpenseWithdrawalAccountId" INTEGER,
ADD COLUMN     "displayMode" TEXT,
ADD COLUMN     "language" TEXT DEFAULT 'en',
ADD COLUMN     "notificationPreferences" JSONB,
ADD COLUMN     "preferredCurrency" TEXT DEFAULT 'USD',
ADD COLUMN     "timezone" TEXT DEFAULT 'UTC';

-- AlterTable
ALTER TABLE "Trade" DROP COLUMN "balanceAfterTrade",
DROP COLUMN "balanceBeforeTrade",
DROP COLUMN "dateTime",
DROP COLUMN "direction",
DROP COLUMN "percentage",
DROP COLUMN "session",
DROP COLUMN "userId",
ADD COLUMN     "accountId" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "entryDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "exitDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "tradeDirection" "TradeDirection" DEFAULT 'LONG',
ADD COLUMN     "tradeType" "TradeType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "pattern" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "userId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "fromAccountId" INTEGER,
ADD COLUMN     "toAccountId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "type",
ADD COLUMN     "type" "TransactionType" NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "accountBalance",
DROP COLUMN "role",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "securityAnswer" TEXT,
ADD COLUMN     "securityQuestion" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerInstitution" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerInstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseSubcategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "ExpenseSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counterparty" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Counterparty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "FinancialAccountType" NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isLiquid" BOOLEAN NOT NULL DEFAULT false,
    "identifier" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "brokerInstitutionId" INTEGER,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxTrade" (
    "id" SERIAL NOT NULL,
    "tradeId" INTEGER NOT NULL,
    "entryPrice" DOUBLE PRECISION,
    "exitPrice" DOUBLE PRECISION,
    "lots" DOUBLE PRECISION,
    "pipsGain" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FxTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StocksTrade" (
    "id" SERIAL NOT NULL,
    "tradeId" INTEGER NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StocksTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DividendPayment" (
    "id" SERIAL NOT NULL,
    "stocksTradeId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DividendPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BondTrade" (
    "id" SERIAL NOT NULL,
    "tradeId" INTEGER NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION NOT NULL,
    "couponRate" DOUBLE PRECISION,
    "maturityDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BondTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceHistory" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "balance" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealEstateInvestment" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "usage" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "currentValuation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealEstateInvestment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealEstateValuation" (
    "id" SERIAL NOT NULL,
    "realEstateInvestmentId" INTEGER NOT NULL,
    "valuationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valuationAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RealEstateValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mortgage" (
    "id" SERIAL NOT NULL,
    "realEstateInvestmentId" INTEGER NOT NULL,
    "mortgageAmount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "termInYears" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "monthlyPayment" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mortgage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringEntry" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "RecurringEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "recurrence" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "mortgageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planName" TEXT NOT NULL,
    "features" JSONB,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMembership" (
    "id" SERIAL NOT NULL,
    "communityId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "CommunityRole" NOT NULL DEFAULT 'MEMBER',
    "rank" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityNews" (
    "id" SERIAL NOT NULL,
    "communityId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "postedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityNews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "communityId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "media" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coaching" (
    "id" SERIAL NOT NULL,
    "coachId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "accountId" INTEGER,
    "module" "FinancialAccountType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coaching_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelegatedAccess" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "delegatedUserId" INTEGER,
    "communityId" INTEGER,
    "accountId" INTEGER,
    "module" "FinancialAccountType",
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'READ',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiration" TIMESTAMP(3),

    CONSTRAINT "DelegatedAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "expenseCategoryId" INTEGER NOT NULL,
    "expenseSubcategoryId" INTEGER,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recurringEntryId" INTEGER,
    "withdrawalAccountId" INTEGER,
    "realEstateInvestmentId" INTEGER,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectedEntry" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "ProjectionType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "projectedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "realEstateInvestmentId" INTEGER,

    CONSTRAINT "ProjectedEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "loanType" "LoanType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "isPaymentActive" BOOLEAN NOT NULL DEFAULT true,
    "counterpartyId" INTEGER NOT NULL,
    "description" TEXT,
    "realEstateInvestmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRepayment" (
    "id" SERIAL NOT NULL,
    "loanId" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "principalPaid" DOUBLE PRECISION NOT NULL,
    "interestPaid" DOUBLE PRECISION NOT NULL,
    "totalPaid" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeLabel" (
    "tradeId" INTEGER NOT NULL,
    "labelId" INTEGER NOT NULL,

    CONSTRAINT "TradeLabel_pkey" PRIMARY KEY ("tradeId","labelId")
);

-- CreateTable
CREATE TABLE "ExpenseLabel" (
    "expenseId" INTEGER NOT NULL,
    "labelId" INTEGER NOT NULL,

    CONSTRAINT "ExpenseLabel_pkey" PRIMARY KEY ("expenseId","labelId")
);

-- CreateTable
CREATE TABLE "RealEstateInvestmentLabel" (
    "realEstateInvestmentId" INTEGER NOT NULL,
    "labelId" INTEGER NOT NULL,

    CONSTRAINT "RealEstateInvestmentLabel_pkey" PRIMARY KEY ("realEstateInvestmentId","labelId")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" SERIAL NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessOwnership" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "businessName" TEXT NOT NULL,
    "sharePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentValuation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessValuation" (
    "id" SERIAL NOT NULL,
    "businessOwnershipId" INTEGER NOT NULL,
    "valuationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valuationAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BusinessValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collectible" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collectible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectibleValuation" (
    "id" SERIAL NOT NULL,
    "collectibleId" INTEGER NOT NULL,
    "valuationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valuationAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CollectibleValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserRoles" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UserRoles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AccountTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AccountTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FxTrade_tradeId_key" ON "FxTrade"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "StocksTrade_tradeId_key" ON "StocksTrade"("tradeId");

-- CreateIndex
CREATE INDEX "DividendPayment_paymentDate_idx" ON "DividendPayment"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "BondTrade_tradeId_key" ON "BondTrade"("tradeId");

-- CreateIndex
CREATE INDEX "idx_balanceHistory_account_date" ON "BalanceHistory"("accountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Mortgage_realEstateInvestmentId_key" ON "Mortgage"("realEstateInvestmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Community_name_key" ON "Community"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMembership_communityId_userId_key" ON "CommunityMembership"("communityId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Coaching_coachId_studentId_accountId_module_key" ON "Coaching"("coachId", "studentId", "accountId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "DelegatedAccess_clientId_delegatedUserId_communityId_accoun_key" ON "DelegatedAccess"("clientId", "delegatedUserId", "communityId", "accountId", "module");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "ProjectedEntry_projectedDate_idx" ON "ProjectedEntry"("projectedDate");

-- CreateIndex
CREATE INDEX "idx_exchangeRate_base_quote_date" ON "ExchangeRate"("baseCurrency", "quoteCurrency", "date");

-- CreateIndex
CREATE INDEX "_UserRoles_B_index" ON "_UserRoles"("B");

-- CreateIndex
CREATE INDEX "_AccountTags_B_index" ON "_AccountTags"("B");

-- CreateIndex
CREATE INDEX "Trade_entryDate_idx" ON "Trade"("entryDate");

-- CreateIndex
CREATE INDEX "Transaction_fromAccountId_idx" ON "Transaction"("fromAccountId");

-- CreateIndex
CREATE INDEX "Transaction_toAccountId_idx" ON "Transaction"("toAccountId");

-- CreateIndex
CREATE INDEX "Transaction_dateTime_idx" ON "Transaction"("dateTime");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSubcategory" ADD CONSTRAINT "ExpenseSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Counterparty" ADD CONSTRAINT "Counterparty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_brokerInstitutionId_fkey" FOREIGN KEY ("brokerInstitutionId") REFERENCES "BrokerInstitution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FxTrade" ADD CONSTRAINT "FxTrade_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocksTrade" ADD CONSTRAINT "StocksTrade_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividendPayment" ADD CONSTRAINT "DividendPayment_stocksTradeId_fkey" FOREIGN KEY ("stocksTradeId") REFERENCES "StocksTrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BondTrade" ADD CONSTRAINT "BondTrade_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceHistory" ADD CONSTRAINT "BalanceHistory_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealEstateInvestment" ADD CONSTRAINT "RealEstateInvestment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealEstateValuation" ADD CONSTRAINT "RealEstateValuation_realEstateInvestmentId_fkey" FOREIGN KEY ("realEstateInvestmentId") REFERENCES "RealEstateInvestment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mortgage" ADD CONSTRAINT "Mortgage_realEstateInvestmentId_fkey" FOREIGN KEY ("realEstateInvestmentId") REFERENCES "RealEstateInvestment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringEntry" ADD CONSTRAINT "RecurringEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringEntry" ADD CONSTRAINT "RecurringEntry_mortgageId_fkey" FOREIGN KEY ("mortgageId") REFERENCES "Mortgage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityNews" ADD CONSTRAINT "CommunityNews_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityNews" ADD CONSTRAINT "CommunityNews_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coaching" ADD CONSTRAINT "Coaching_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coaching" ADD CONSTRAINT "Coaching_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coaching" ADD CONSTRAINT "Coaching_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegatedAccess" ADD CONSTRAINT "DelegatedAccess_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegatedAccess" ADD CONSTRAINT "DelegatedAccess_delegatedUserId_fkey" FOREIGN KEY ("delegatedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegatedAccess" ADD CONSTRAINT "DelegatedAccess_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegatedAccess" ADD CONSTRAINT "DelegatedAccess_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_expenseSubcategoryId_fkey" FOREIGN KEY ("expenseSubcategoryId") REFERENCES "ExpenseSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringEntryId_fkey" FOREIGN KEY ("recurringEntryId") REFERENCES "RecurringEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_withdrawalAccountId_fkey" FOREIGN KEY ("withdrawalAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_realEstateInvestmentId_fkey" FOREIGN KEY ("realEstateInvestmentId") REFERENCES "RealEstateInvestment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectedEntry" ADD CONSTRAINT "ProjectedEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectedEntry" ADD CONSTRAINT "ProjectedEntry_realEstateInvestmentId_fkey" FOREIGN KEY ("realEstateInvestmentId") REFERENCES "RealEstateInvestment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_realEstateInvestmentId_fkey" FOREIGN KEY ("realEstateInvestmentId") REFERENCES "RealEstateInvestment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRepayment" ADD CONSTRAINT "LoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeLabel" ADD CONSTRAINT "TradeLabel_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeLabel" ADD CONSTRAINT "TradeLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLabel" ADD CONSTRAINT "ExpenseLabel_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLabel" ADD CONSTRAINT "ExpenseLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealEstateInvestmentLabel" ADD CONSTRAINT "RealEstateInvestmentLabel_realEstateInvestmentId_fkey" FOREIGN KEY ("realEstateInvestmentId") REFERENCES "RealEstateInvestment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealEstateInvestmentLabel" ADD CONSTRAINT "RealEstateInvestmentLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessOwnership" ADD CONSTRAINT "BusinessOwnership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessValuation" ADD CONSTRAINT "BusinessValuation_businessOwnershipId_fkey" FOREIGN KEY ("businessOwnershipId") REFERENCES "BusinessOwnership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collectible" ADD CONSTRAINT "Collectible_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleValuation" ADD CONSTRAINT "CollectibleValuation_collectibleId_fkey" FOREIGN KEY ("collectibleId") REFERENCES "Collectible"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserRoles" ADD CONSTRAINT "_UserRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserRoles" ADD CONSTRAINT "_UserRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccountTags" ADD CONSTRAINT "_AccountTags_A_fkey" FOREIGN KEY ("A") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccountTags" ADD CONSTRAINT "_AccountTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
