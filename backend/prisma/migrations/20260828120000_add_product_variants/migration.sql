-- Fase 1 da separação Product -> Product genérico + ProductVariant (ver docs/ESQUEMA.md).
-- Migration ADITIVA: cria a tabela ProductVariant, faz backfill 1:1 a partir de
-- cada Product existente (preserva todo o histórico de PriceRecord sem perda),
-- e liga PriceRecord à nova variante. NÃO remove nada do modelo antigo
-- (Product.brand/unit, PriceRecord.productId) — isso só acontece numa migration
-- de limpeza posterior, depois de o backend passar a escrever exclusivamente
-- no modelo novo e de se validar em produção durante algum tempo.

-- AlterTable: nova flag em Product para marcar produtos criados por ingestão
-- automática (n8n) que ainda não foram revistos/curados manualmente.
ALTER TABLE "Product" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: productId em PriceRecord deixa de ser obrigatório — passa a
-- legado, mantido só para não perder o histórico já escrito; o backend deixa
-- de o exigir em escritas novas assim que passar a usar variantId.
ALTER TABLE "PriceRecord" ALTER COLUMN "productId" DROP NOT NULL;

-- DropForeignKey / AddForeignKey: a FK legada de productId passa de
-- ON DELETE CASCADE para ON DELETE SET NULL. Agora que uma variante pode ser
-- reatribuída para outro Product (ver ProductVariant/reassign), uma
-- PriceRecord pode ficar com productId "desatualizado" face à sua variante —
-- apagar esse Product antigo não pode continuar a apagar em cascata preços
-- que, através de variantId, já pertencem a outro produto.
ALTER TABLE "PriceRecord" DROP CONSTRAINT "PriceRecord_productId_fkey";
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: unit em Product deixa de ser obrigatório — passa a legado
-- (agora vive em ProductVariant.unit); produtos criados a partir de agora já
-- não o preenchem.
ALTER TABLE "Product" ALTER COLUMN "unit" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "brand" TEXT,
    "packageSize" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_brand_packageSize_unit_key" ON "ProductVariant"("productId", "brand", "packageSize", "unit");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: cria exatamente 1 ProductVariant por Product existente,
-- reaproveitando o brand/unit que hoje vivem no próprio Product. É uma divisão
-- 1:1 (não uma fusão) — dois Products hoje distintos (ex: "ACUCAR BR SIDUL..."
-- e "ACUCAR BRANCO CONTINENTE...") continuam a ser dois Products distintos,
-- cada um com a sua variante; fundi-los num único produto genérico é uma
-- decisão de curadoria manual, feita depois pela ferramenta de reatribuição.
INSERT INTO "ProductVariant" ("productId", "brand", "packageSize", "unit", "createdAt", "updatedAt", "createdById", "updatedById")
SELECT "id", "brand", NULL, "unit", "createdAt", "updatedAt", "createdById", "updatedById"
FROM "Product";

-- AlterTable: nova coluna em PriceRecord, ainda opcional para poder ser
-- populada antes de se tornar obrigatória.
ALTER TABLE "PriceRecord" ADD COLUMN "variantId" INTEGER;

-- DataMigration: reponta cada PriceRecord para a variante recém-criada do seu
-- Product. Nesta fase cada Product tem exatamente 1 variante (ver INSERT
-- acima), por isso o JOIN é inequívoco.
UPDATE "PriceRecord" pr
SET "variantId" = pv."id"
FROM "ProductVariant" pv
WHERE pv."productId" = pr."productId";

-- AlterTable: agora que todas as linhas têm variantId, torna-a obrigatória.
ALTER TABLE "PriceRecord" ALTER COLUMN "variantId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "PriceRecord_variantId_idx" ON "PriceRecord"("variantId");

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: marca como "por rever" os Products criados historicamente
-- pela ingestão automática de faturas (n8n) — identificados de forma
-- determinística pelo utilizador placeholder que os criou, sem heurística de
-- texto. Products criados manualmente ficam com needsReview = false (default).
UPDATE "Product" p
SET "needsReview" = true
FROM "User" u
WHERE u."email" = 'sistema@carrinho-compras.local'
  AND p."createdById" = u."id";

-- CreateIndex
CREATE INDEX "Product_needsReview_idx" ON "Product"("needsReview");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");
