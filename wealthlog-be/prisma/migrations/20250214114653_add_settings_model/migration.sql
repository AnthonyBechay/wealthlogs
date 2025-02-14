/*
  Warnings:

  - You are about to drop the column `outcome` on the `Trade` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Trade" DROP COLUMN "outcome",
ADD COLUMN     "fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "percentage" DOUBLE PRECISION,
ALTER COLUMN "amount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Settings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "instruments" JSONB NOT NULL,
    "patterns" JSONB NOT NULL,
    "beMin" DOUBLE PRECISION NOT NULL DEFAULT -0.2,
    "beMax" DOUBLE PRECISION NOT NULL DEFAULT 0.3,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
