import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { getAuthUser } from '../middleware/auth.middleware'

const supermarketSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  location: z.string().nullable().optional(),
})

const userSelect = { select: { id: true, name: true } }

export async function getSupermarkets(_request: FastifyRequest, reply: FastifyReply) {
  const supermarkets = await prisma.supermarket.findMany({
    include: { _count: { select: { prices: true } }, createdBy: userSelect, updatedBy: userSelect },
    orderBy: { name: 'asc' },
  })
  return reply.send(supermarkets)
}

export async function getSupermarket(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const supermarket = await prisma.supermarket.findUnique({
    where: { id: Number(request.params.id) },
    include: {
      prices: { include: { product: true }, orderBy: { date: 'desc' }, take: 50 },
      createdBy: userSelect,
      updatedBy: userSelect,
    },
  })
  if (!supermarket) return reply.status(404).send({ error: 'Supermercado não encontrado' })
  return reply.send(supermarket)
}

export async function createSupermarket(request: FastifyRequest, reply: FastifyReply) {
  const data = supermarketSchema.parse(request.body)
  const { userId } = getAuthUser(request)
  const supermarket = await prisma.supermarket.create({
    data: { ...data, createdById: userId, updatedById: userId },
    include: { createdBy: userSelect, updatedBy: userSelect },
  })
  return reply.status(201).send(supermarket)
}

export async function updateSupermarket(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const data = supermarketSchema.partial().parse(request.body)
  const { userId } = getAuthUser(request)
  const supermarket = await prisma.supermarket.update({
    where: { id: Number(request.params.id) },
    data: { ...data, updatedById: userId },
    include: { createdBy: userSelect, updatedBy: userSelect },
  })
  return reply.send(supermarket)
}

export async function deleteSupermarket(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await prisma.supermarket.delete({ where: { id: Number(request.params.id) } })
  return reply.status(204).send()
}
