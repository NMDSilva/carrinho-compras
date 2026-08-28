import { FastifyRequest, FastifyReply } from 'fastify'
import { getAuthUser } from '../../shared/middleware/auth.middleware'
import { canWriteResource } from '../../shared/lib/ownership'
import { priceRecordSchema } from './prices.schema'
import * as pricesService from './prices.service'

export async function getPrices(
  request: FastifyRequest<{
    Querystring: { variantId?: number; productId?: number; supermarketId?: number; limit: number; offset: number }
  }>,
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
  const id = Number(request.params.id)
  const existing = await pricesService.getPriceById(id)
  if (!existing) return reply.status(404).send({ error: 'Registo não encontrado' })

  const { userId, userRole } = getAuthUser(request)
  if (!canWriteResource(userRole, userId, existing.createdById))
    return reply.status(403).send({ error: 'Sem permissão para editar este registo' })

  const data = priceRecordSchema.partial().parse(request.body)
  const price = await pricesService.updatePrice(id, data, userId)
  return reply.send(price)
}

export async function deletePrice(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = Number(request.params.id)
  const existing = await pricesService.getPriceById(id)
  if (!existing) return reply.status(404).send({ error: 'Registo não encontrado' })

  const { userId, userRole } = getAuthUser(request)
  if (!canWriteResource(userRole, userId, existing.createdById))
    return reply.status(403).send({ error: 'Sem permissão para eliminar este registo' })

  await pricesService.deletePrice(id)
  return reply.status(204).send()
}

// Melhor preço de um produto genérico por supermercado, através de todas as
// suas variantes/marcas — ordenado do mais barato para o mais caro.
export async function compareProductPrices(request: FastifyRequest<{ Params: { productId: string } }>, reply: FastifyReply) {
  const productId = Number(request.params.productId)
  const product = await pricesService.findProductById(productId)
  if (!product) return reply.status(404).send({ error: 'Produto não encontrado' })

  const allPrices = await pricesService.listProductPrices(productId)

  // Mais recente por par (supermercado, variante) — listProductPrices já vem
  // ordenado por data desc, por isso a primeira ocorrência de cada par é a
  // mais recente. Mantém marcas diferentes no mesmo supermercado visíveis.
  const byPair = new Map<string, (typeof allPrices)[0]>()
  for (const p of allPrices) {
    const key = `${p.supermarketId}-${p.variantId}`
    if (!byPair.has(key)) byPair.set(key, p)
  }

  return reply.send({ product, prices: Array.from(byPair.values()).sort((a, b) => a.price - b.price) })
}

// Histórico de preços de UMA variante — misturar marcas diferentes na mesma
// série temporal seria enganador.
export async function getPriceHistory(
  request: FastifyRequest<{ Params: { variantId: string }; Querystring: { supermarketIds?: string } }>,
  reply: FastifyReply
) {
  const variantId = Number(request.params.variantId)
  const { supermarketIds } = request.query

  const supermarketFilter = supermarketIds
    ? supermarketIds.split(',').map(Number).filter((n) => !isNaN(n))
    : undefined

  const variant = await pricesService.findVariantById(variantId)
  if (!variant) return reply.status(404).send({ error: 'Variante não encontrada' })

  const history = await pricesService.listPriceHistory(variantId, supermarketFilter)

  const grouped: Record<string, { supermarket: { id: number; name: string }; records: { date: string; price: number }[] }> = {}
  for (const record of history) {
    const key = String(record.supermarketId)
    if (!grouped[key]) grouped[key] = { supermarket: { id: record.supermarket.id, name: record.supermarket.name }, records: [] }
    grouped[key].records.push({ date: record.date.toISOString(), price: record.price })
  }

  return reply.send({ variant, history: Object.values(grouped) })
}

export async function getDashboardStats(_request: FastifyRequest, reply: FastifyReply) {
  const [totalProducts, totalSupermarkets, totalPrices, recentPrices] = await pricesService.getDashboardCounts()
  const cheapestByProduct = await pricesService.getCheapestByProduct()

  return reply.send({ stats: { totalProducts, totalSupermarkets, totalPrices }, recentPrices, cheapestByProduct })
}
