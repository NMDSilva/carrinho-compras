import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { getAuthUser } from '../middleware/auth.middleware'

const priceRecordSchema = z.object({
  productId: z.number().int().positive(),
  supermarketId: z.number().int().positive(),
  price: z.number().positive('Preço deve ser positivo'),
  quantity: z.number().positive().default(1),
  date: z.string().datetime().optional(),
  notes: z.string().nullable().optional(),
})

const userSelect = { select: { id: true, name: true } }

export async function getPrices(
  request: FastifyRequest<{ Querystring: { productId?: string; supermarketId?: string; limit?: string; offset?: string } }>,
  reply: FastifyReply
) {
  const { productId, supermarketId, limit = '20', offset = '0' } = request.query
  const where = {
    ...(productId ? { productId: Number(productId) } : {}),
    ...(supermarketId ? { supermarketId: Number(supermarketId) } : {}),
  }
  const [prices, total] = await Promise.all([
    prisma.priceRecord.findMany({
      where,
      include: { product: true, supermarket: true, createdBy: userSelect, updatedBy: userSelect },
      orderBy: { date: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    }),
    prisma.priceRecord.count({ where }),
  ])
  return reply.send({ data: prices, total })
}

export async function createPrice(request: FastifyRequest, reply: FastifyReply) {
  const data = priceRecordSchema.parse(request.body)
  const { userId } = getAuthUser(request)
  const price = await prisma.priceRecord.create({
    data: { ...data, date: data.date ? new Date(data.date) : new Date(), createdById: userId, updatedById: userId },
    include: { product: true, supermarket: true, createdBy: userSelect, updatedBy: userSelect },
  })
  return reply.status(201).send(price)
}

export async function getPriceById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const price = await prisma.priceRecord.findUnique({
    where: { id: Number(request.params.id) },
    include: { product: true, supermarket: true, createdBy: userSelect, updatedBy: userSelect },
  })
  if (!price) return reply.status(404).send({ error: 'Registo não encontrado' })
  return reply.send(price)
}

export async function updatePrice(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const data = priceRecordSchema.partial().parse(request.body)
  const { userId } = getAuthUser(request)
  const price = await prisma.priceRecord.update({
    where: { id: Number(request.params.id) },
    data: { ...data, ...(data.date ? { date: new Date(data.date) } : {}), updatedById: userId },
    include: { product: true, supermarket: true, createdBy: userSelect, updatedBy: userSelect },
  })
  return reply.send(price)
}

export async function deletePrice(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await prisma.priceRecord.delete({ where: { id: Number(request.params.id) } })
  return reply.status(204).send()
}

export async function compareProductPrices(request: FastifyRequest<{ Params: { productId: string } }>, reply: FastifyReply) {
  const productId = Number(request.params.productId)
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return reply.status(404).send({ error: 'Produto não encontrado' })

  const allPrices = await prisma.priceRecord.findMany({
    where: { productId },
    include: { supermarket: true, createdBy: userSelect },
    orderBy: { date: 'desc' },
  })

  const bySuper = new Map<number, (typeof allPrices)[0]>()
  for (const p of allPrices) {
    if (!bySuper.has(p.supermarketId)) bySuper.set(p.supermarketId, p)
  }

  return reply.send({ product, prices: Array.from(bySuper.values()).sort((a, b) => a.price - b.price) })
}

export async function getPriceHistory(
  request: FastifyRequest<{ Params: { productId: string }; Querystring: { supermarketIds?: string } }>,
  reply: FastifyReply
) {
  const productId = Number(request.params.productId)
  const { supermarketIds } = request.query

  const supermarketFilter = supermarketIds
    ? supermarketIds.split(',').map(Number).filter((n) => !isNaN(n))
    : undefined

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return reply.status(404).send({ error: 'Produto não encontrado' })

  const history = await prisma.priceRecord.findMany({
    where: { productId, ...(supermarketFilter ? { supermarketId: { in: supermarketFilter } } : {}) },
    include: { supermarket: true },
    orderBy: { date: 'asc' },
  })

  const grouped: Record<string, { supermarket: { id: number; name: string }; records: { date: string; price: number }[] }> = {}
  for (const record of history) {
    const key = String(record.supermarketId)
    if (!grouped[key]) grouped[key] = { supermarket: { id: record.supermarket.id, name: record.supermarket.name }, records: [] }
    grouped[key].records.push({ date: record.date.toISOString(), price: record.price })
  }

  return reply.send({ product, history: Object.values(grouped) })
}

export async function getDashboardStats(_request: FastifyRequest, reply: FastifyReply) {
  const [totalProducts, totalSupermarkets, totalPrices, recentPrices] = await Promise.all([
    prisma.product.count(),
    prisma.supermarket.count(),
    prisma.priceRecord.count(),
    prisma.priceRecord.findMany({
      include: { product: true, supermarket: true, createdBy: userSelect },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  // Preço mais barato por produto (PostgreSQL DISTINCT ON)
  const cheapestByProduct = await prisma.$queryRaw<
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

  return reply.send({ stats: { totalProducts, totalSupermarkets, totalPrices }, recentPrices, cheapestByProduct })
}
