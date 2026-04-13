import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { getSupermarkets, getSupermarket, createSupermarket, updateSupermarket, deleteSupermarket } from '../controllers/supermarkets.controller'
import { requireAuth } from '../middleware/auth.middleware'

const supermarketBodySchema = z.object({
  name: z.string().min(1),
  location: z.string().nullable().optional(),
})

const supermarketsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/', {
    schema: { tags: ['Supermercados'], summary: 'Listar supermercados' },
    handler: getSupermarkets,
  })

  fastify.get('/:id', {
    schema: {
      tags: ['Supermercados'],
      summary: 'Detalhes de um supermercado',
      params: z.object({ id: z.string() }),
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
      params: z.object({ id: z.string() }),
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
      params: z.object({ id: z.string() }),
    },
    handler: deleteSupermarket,
  })
}

export default supermarketsRoutes
