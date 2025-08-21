-- CreateTable
CREATE TABLE "status_history" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "previousStatus" BOOLEAN NOT NULL,
    "newStatus" BOOLEAN NOT NULL,
    "reason" TEXT,
    "comment" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT,

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
