-- CreateTable
CREATE TABLE "TradeMedia" (
    "id" SERIAL NOT NULL,
    "tradeId" INTEGER NOT NULL,
    "labelId" INTEGER,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeMedia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TradeMedia" ADD CONSTRAINT "TradeMedia_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeMedia" ADD CONSTRAINT "TradeMedia_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE SET NULL ON UPDATE CASCADE;
