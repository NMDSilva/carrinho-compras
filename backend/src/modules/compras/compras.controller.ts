import { FastifyRequest, FastifyReply } from 'fastify'
import { comprasSchemaRequest } from './compras.schema'
import * as comprasService from './compras.service'

export async function registarCompra(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = comprasSchemaRequest.parse(request.body)
  const result = await comprasService.registarCompra(body)
  return reply.status(201).send(result)
}
