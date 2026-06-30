import { FastifyRequest, FastifyReply } from 'fastify'
import { getAuthUser } from '../../shared/middleware/auth.middleware'
import { priceRecordSchema } from './prices.schema'
import * as pricesService from './prices.service'

export async function getPrices(
  request: FastifyRequest<{ Querystring: { productId?: string; supermarketId?: string; limit?: string; offset?: string } }>,
  reply: FastifyReply
) {
  const [prices, total] = await pricesService.listPrices(request.query)
  return reply.send({ data: prices, total })
}

export async function createPrice(request: FastifyRequest, reply: FastifyReply) {
  const data = priceRecordSchema.parse(request.body)
  const { userId } = getAuthUser(request)
  const price = await pricesService.createPrice(data, userId)
  return reply.status(201).send(price)
}

export async function getPriceById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const price = await pricesService.getPriceById(Number(request.params.id))
  if (!price) return reply.status(404).send({ error: 'Registo não encontrado' })
  return reply.send(price)
}

export async function updatePrice(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const data = priceRecordSchema.partial().parse(request.body)
  const { userId } = getAuthUser(request)
  const price = await pricesService.updatePrice(Number(request.params.id), data, userId)
  return reply.send(price)
}

export async function deletePrice(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await pricesService.deletePrice(Number(request.params.id))
  return reply.status(204).send()
}

export async function compareProductPrices(request: FastifyRequest<{ Params: { productId: string } }>, reply: FastifyReply) {
  const productId = Number(request.params.productId)
  const product = await pricesService.findProductById(productId)
  if (!product) return reply.status(404).send({ error: 'Produto não encontrado' })

  const allPrices = await pricesService.listProductPrices(productId)

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

  const product = await pricesService.findProductById(productId)
  if (!product) return reply.status(404).send({ error: 'Produto não encontrado' })

  const history = await pricesService.listPriceHistory(productId, supermarketFilter)

  const grouped: Record<string, { supermarket: { id: number; name: string }; records: { date: string; price: number }[] }> = {}
  for (const record of history) {
    const key = String(record.supermarketId)
    if (!grouped[key]) grouped[key] = { supermarket: { id: record.supermarket.id, name: record.supermarket.name }, records: [] }
    grouped[key].records.push({ date: record.date.toISOString(), price: record.price })
  }

  return reply.send({ product, history: Object.values(grouped) })
}

export async function getDashboardStats(_request: FastifyRequest, reply: FastifyReply) {
  const [totalProducts, totalSupermarkets, totalPrices, recentPrices] = await pricesService.getDashboardCounts()
  const cheapestByProduct = await pricesService.getCheapestByProduct()

  return reply.send({ stats: { totalProducts, totalSupermarkets, totalPrices }, recentPrices, cheapestByProduct })
}
