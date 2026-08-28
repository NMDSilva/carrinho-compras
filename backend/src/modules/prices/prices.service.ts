import prisma from '../../shared/lib/prisma'

const userSelect = { select: { id: true, name: true } }

const priceInclude = {
  variant: { include: { product: true } },
  supermarket: true,
  createdBy: userSelect,
  updatedBy: userSelect,
}

export function listPrices(filters: {
  variantId?: number
  productId?: number
  supermarketId?: number
  limit: number
  offset: number
}) {
  const { variantId, productId, supermarketId, limit, offset } = filters
  const where = {
    ...(variantId ? { variantId } : {}),
    ...(productId ? { variant: { productId } } : {}),
    ...(supermarketId ? { supermarketId } : {}),
  }
  return Promise.all([
    prisma.priceRecord.findMany({
      where,
      include: priceInclude,
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.priceRecord.count({ where }),
  ])
}

export function createPrice(data: Record<string, unknown> & { date?: string }, userId: number) {
  return prisma.priceRecord.create({
    data: { ...data, date: data.date ? new Date(data.date) : new Date(), createdById: userId, updatedById: userId } as never,
    include: priceInclude,
  })
}

export function getPriceById(id: number) {
  return prisma.priceRecord.findUnique({ where: { id }, include: priceInclude })
}

export function updatePrice(id: number, data: Record<string, unknown> & { date?: string }, userId: number) {
  return prisma.priceRecord.update({
    where: { id },
    data: { ...data, ...(data.date ? { date: new Date(data.date) } : {}), updatedById: userId },
    include: priceInclude,
  })
}

export function deletePrice(id: number) {
  return prisma.priceRecord.delete({ where: { id } })
}

export function findProductById(id: number) {
  return prisma.product.findUnique({ where: { id } })
}

export function findVariantById(id: number) {
  return prisma.productVariant.findUnique({ where: { id }, include: { product: true } })
}

// Todos os preços de um produto genérico, através de todas as suas variantes
// — usado na comparação entre supermercados/marcas (compareProductPrices).
export function listProductPrices(productId: number) {
  return prisma.priceRecord.findMany({
    where: { variant: { productId } },
    include: { variant: true, supermarket: true, createdBy: userSelect },
    orderBy: { date: 'desc' },
  })
}

// Histórico de preços de UMA variante — misturar marcas diferentes na mesma
// série temporal seria enganador, por isso é sempre ao nível da variante.
export function listPriceHistory(variantId: number, supermarketFilter?: number[]) {
  return prisma.priceRecord.findMany({
    where: { variantId, ...(supermarketFilter ? { supermarketId: { in: supermarketFilter } } : {}) },
    include: { supermarket: true },
    orderBy: { date: 'asc' },
  })
}

export function getDashboardCounts() {
  return Promise.all([
    prisma.product.count(),
    prisma.supermarket.count(),
    prisma.priceRecord.count(),
    prisma.priceRecord.findMany({
      include: { variant: { include: { product: true } }, supermarket: true, createdBy: userSelect },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])
}

// Melhor preço por produto genérico, independentemente da marca/variante —
// única query SQL raw do projeto (o Prisma Client não gera DISTINCT ON).
export function getCheapestByProduct() {
  return prisma.$queryRaw<
    {
      productId: number
      productName: string
      minPrice: number
      supermarketName: string
      date: Date
      variantBrand: string | null
      variantUnit: string
    }[]
  >`
    SELECT DISTINCT ON ("p"."id")
      "p"."id" AS "productId",
      "p"."name" AS "productName",
      "pr"."price" AS "minPrice",
      "s"."name" AS "supermarketName",
      "pr"."date" AS "date",
      "pv"."brand" AS "variantBrand",
      "pv"."unit" AS "variantUnit"
    FROM "PriceRecord" pr
    JOIN "ProductVariant" pv ON pv.id = pr."variantId"
    JOIN "Product" p ON p.id = pv."productId"
    JOIN "Supermarket" s ON s.id = pr."supermarketId"
    ORDER BY "p"."id", "pr"."price" ASC
    LIMIT 10
  `
}
