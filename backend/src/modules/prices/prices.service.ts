import prisma from '../../shared/lib/prisma'

const userSelect = { select: { id: true, name: true } }

const priceInclude = {
  product: true,
  supermarket: true,
  createdBy: userSelect,
  updatedBy: userSelect,
}

export function listPrices(filters: { productId?: number; supermarketId?: number; limit: number; offset: number }) {
  const { productId, supermarketId, limit, offset } = filters
  const where = {
    ...(productId ? { productId } : {}),
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

export function listProductPrices(productId: number) {
  return prisma.priceRecord.findMany({
    where: { productId },
    include: { supermarket: true, createdBy: userSelect },
    orderBy: { date: 'desc' },
  })
}

export function listPriceHistory(productId: number, supermarketFilter?: number[]) {
  return prisma.priceRecord.findMany({
    where: { productId, ...(supermarketFilter ? { supermarketId: { in: supermarketFilter } } : {}) },
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
      include: { product: true, supermarket: true, createdBy: userSelect },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])
}

export function getCheapestByProduct() {
  // Preço mais barato por produto (PostgreSQL DISTINCT ON)
  return prisma.$queryRaw<
    { productId: number; productName: string; minPrice: number; supermarketName: string; date: Date }[]
  >`
    SELECT DISTINCT ON ("p"."id")
      "p"."id" AS "productId",
      "p"."name" AS "productName",
      "pr"."price" AS "minPrice",
      "s"."name" AS "supermarketName",
      "pr"."date" AS "date"
    FROM "PriceRecord" pr
    JOIN "Product" p ON p.id = pr."productId"
    JOIN "Supermarket" s ON s.id = pr."supermarketId"
    ORDER BY "p"."id", "pr"."price" ASC
    LIMIT 10
  `
}
