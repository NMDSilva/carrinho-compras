-- AlterTable
ALTER TABLE "PriceRecord" ADD COLUMN     "invoiceLine" INTEGER,
ADD COLUMN     "invoiceRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PriceRecord_invoiceRef_supermarketId_invoiceLine_key" ON "PriceRecord"("invoiceRef", "supermarketId", "invoiceLine");

-- CreateIndex
CREATE INDEX "PriceRecord_invoiceRef_idx" ON "PriceRecord"("invoiceRef");
