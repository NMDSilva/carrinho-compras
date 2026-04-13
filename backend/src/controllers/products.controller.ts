import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { getAuthUser } from '../middleware/auth.middleware'

const productSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  brand: z.string().nullable().optional(),
  unit: z.string().min(1, 'Unidade obrigatória'),
  category: z.string().nullable().optional(),
})

const userSelect = { select: { id: true, name: true } }

export async function getProducts(request: FastifyRequest<{ Querystring: { search?: string; category?: string } }>, reply: FastifyReply) {
  const { search, category } = request.query
  const products = await prisma.product.findMany({
    where: {
      AND: [
        search ? { name: { contains: search, mode: 'insensitive' } } : {},
        category ? { category } : {},
      ],
    },
    include: { _count: { select: { prices: true } }, createdBy: userSelect, updatedBy: userSelect },
    orderBy: { name: 'asc' },
  })
  return reply.send(products)
}

export async function getProduct(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const product = await prisma.product.findUnique({
    where: { id: Number(request.params.id) },
    include: {
      prices: { include: { supermarket: true }, orderBy: { date: 'desc' }, take: 50 },
      createdBy: userSelect,
      updatedBy: userSelect,
    },
  })
  if (!product) return reply.status(404).send({ error: 'Produto não encontrado' })
  return reply.send(product)
}

export async function getCategories(_request: FastifyRequest, reply: FastifyReply) {
  const categories = await prisma.product.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  })
  return reply.send(categories.map((c) => c.category).filter(Boolean))
}

export async function createProduct(request: FastifyRequest, reply: FastifyReply) {
  const data = productSchema.parse(request.body)
  const { userId } = getAuthUser(request)
  const product = await prisma.product.create({
    data: { ...data, createdById: userId, updatedById: userId },
    include: { createdBy: userSelect, updatedBy: userSelect },
  })
  return reply.status(201).send(product)
}

export async function updateProduct(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const data = productSchema.partial().parse(request.body)
  const { userId } = getAuthUser(request)
  const product = await prisma.product.update({
    where: { id: Number(request.params.id) },
    data: { ...data, updatedById: userId },
    include: { createdBy: userSelect, updatedBy: userSelect },
  })
  return reply.send(product)
}

export async function deleteProduct(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await prisma.product.delete({ where: { id: Number(request.params.id) } })
  return reply.status(204).send()
}
