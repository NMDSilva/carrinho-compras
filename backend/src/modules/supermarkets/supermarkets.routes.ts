import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import {
  getSupermarkets,
  getSupermarket,
  createSupermarket,
  updateSupermarket,
  deleteSupermarket,
} from './supermarkets.controller'
import { requireAuth } from '../../shared/middleware/auth.middleware'
import { supermarketBodySchema, supermarketIdParamSchema } from './supermarkets.schema'

const supermarketsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Supermercados'],
      summary: 'Listar supermercados',
      security: [{ bearerAuth: [] }],
    },
    handler: getSupermarkets,
  })

  fastify.get('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Supermercados'],
      summary: 'Detalhes de um supermercado',
      security: [{ bearerAuth: [] }],
      params: supermarketIdParamSchema,
    },
    handler: getSupermarket,
  })

  fastify.post('/', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Supermercados'],
      summary: 'Criar supermercado',
      security: [{ bearerAuth: [] }],
      body: supermarketBodySchema,
    },
    handler: createSupermarket,
  })

  fastify.put('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Supermercados'],
      summary: 'Atualizar supermercado',
      security: [{ bearerAuth: [] }],
      params: supermarketIdParamSchema,
      body: supermarketBodySchema.partial(),
    },
    handler: updateSupermarket,
  })

  fastify.delete('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Supermercados'],
      summary: 'Eliminar supermercado',
      security: [{ bearerAuth: [] }],
      params: supermarketIdParamSchema,
    },
    handler: deleteSupermarket,
  })
}

export default supermarketsRoutes
