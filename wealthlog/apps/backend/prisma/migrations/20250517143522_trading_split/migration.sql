/*
  Warnings:

  - You are about to drop the column `instruments` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `patterns` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `instrument` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `pattern` on the `Trade` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "instruments",
DROP COLUMN "patterns";

-- AlterTable
ALTER TABLE "Trade" DROP COLUMN "instrument",
DROP COLUMN "pattern",
ADD COLUMN     "instrumentId" INTEGER,
ADD COLUMN     "patternId" INTEGER;

-- CreateTable
CREATE TABLE "FinancialInstrument" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "FinancialInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingPattern" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TradingPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialInstrument_userId_name_key" ON "FinancialInstrument"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TradingPattern_userId_name_key" ON "TradingPattern"("userId", "name");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "FinancialInstrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "TradingPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;
