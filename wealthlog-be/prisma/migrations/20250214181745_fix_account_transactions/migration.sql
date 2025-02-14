/*
  Warnings:

  - You are about to drop the `AccountTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AccountTransaction" DROP CONSTRAINT "AccountTransaction_userId_fkey";

-- DropTable
DROP TABLE "AccountTransaction";
