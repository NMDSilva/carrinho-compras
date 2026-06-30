import { FastifyRequest, FastifyReply } from 'fastify'
import { getAuthUser } from '../../shared/middleware/auth.middleware'
import { productBodySchema } from './products.schema'
import * as productsService from './products.service'

export async function getProducts(
  request: FastifyRequest<{
    Querystring: { search?: string; category?: string }
  }>,
  reply: FastifyReply
) {
  const products = await productsService.listProducts(request.query)
  return reply.send(products)
}

export async function getProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const product = await productsService.getProductById(Number(request.params.id))
  if (!product)
    return reply.status(404).send({ error: 'Produto não encontrado' })
  return reply.send(product)
}

export async function getCategories(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const categories = await productsService.listCategories()
  return reply.send(categories.map((c) => c.category!).filter(Boolean))
}

export async function createProduct(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const data = productBodySchema.parse(request.body)
  const { userId } = getAuthUser(request)
  const product = await productsService.createProduct(data, userId)
  return reply.status(201).send(product)
}

export async function updateProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const data = productBodySchema.partial().parse(request.body)
  const { userId } = getAuthUser(request)
  const product = await productsService.updateProduct(Number(request.params.id), data, userId)
  return reply.send(product)
}

export async function deleteProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  await productsService.deleteProduct(Number(request.params.id))
  return reply.status(204).send()
}
