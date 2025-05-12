-- AlterTable
ALTER TABLE "FinancialAccount" ADD COLUMN     "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lastRecalculatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "realizedPL" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "balanceImpact" DOUBLE PRECISION;
