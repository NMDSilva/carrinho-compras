import { FastifyRequest, FastifyReply } from 'fastify'
import { getAuthUser } from '../../shared/middleware/auth.middleware'
import { canWriteResource } from '../../shared/lib/ownership'
import { supermarketBodySchema } from './supermarkets.schema'
import * as supermarketsService from './supermarkets.service'

export async function getSupermarkets(_request: FastifyRequest, reply: FastifyReply) {
  const supermarkets = await supermarketsService.listSupermarkets()
  return reply.send(supermarkets)
}

export async function getSupermarket(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const supermarket = await supermarketsService.getSupermarketById(Number(request.params.id))
  if (!supermarket) return reply.status(404).send({ error: 'Supermercado não encontrado' })
  return reply.send(supermarket)
}

export async function createSupermarket(request: FastifyRequest, reply: FastifyReply) {
  const data = supermarketBodySchema.parse(request.body)
  const { userId } = getAuthUser(request)
  const supermarket = await supermarketsService.createSupermarket(data, userId)
  return reply.status(201).send(supermarket)
}

export async function updateSupermarket(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = Number(request.params.id)
  const existing = await supermarketsService.getSupermarketById(id)
  if (!existing) return reply.status(404).send({ error: 'Supermercado não encontrado' })

  const { userId, userRole } = getAuthUser(request)
  if (!canWriteResource(userRole, userId, existing.createdById))
    return reply.status(403).send({ error: 'Sem permissão para editar este supermercado' })

  const data = supermarketBodySchema.partial().parse(request.body)
  const supermarket = await supermarketsService.updateSupermarket(id, data, userId)
  return reply.send(supermarket)
}

export async function deleteSupermarket(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = Number(request.params.id)
  const existing = await supermarketsService.getSupermarketById(id)
  if (!existing) return reply.status(404).send({ error: 'Supermercado não encontrado' })

  const { userId, userRole } = getAuthUser(request)
  if (!canWriteResource(userRole, userId, existing.createdById))
    return reply.status(403).send({ error: 'Sem permissão para eliminar este supermercado' })

  await supermarketsService.deleteSupermarket(id)
  return reply.status(204).send()
}
