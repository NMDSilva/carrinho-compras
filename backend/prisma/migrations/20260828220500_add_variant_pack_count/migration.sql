-- Acrescenta a quantidade de embalagens à variante (ex: "3X210G" ->
-- packageSize=210, packCount=3), para distinguir um multipack de um pack
-- simples do mesmo tamanho/marca (ver docs/ESQUEMA.md).

-- DropIndex
DROP INDEX "ProductVariant_productId_brand_packageSize_unit_key";

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN "packCount" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_brand_packageSize_unit_packCount_key" ON "ProductVariant"("productId", "brand", "packageSize", "unit", "packCount");
