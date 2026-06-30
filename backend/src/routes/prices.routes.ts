import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { getPrices, getPriceById, createPrice, updatePrice, deletePrice, compareProductPrices, getPriceHistory, getDashboardStats } from '../controllers/prices.controller'
import { requireAuth } from '../middleware/auth.middleware'

const pricesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/dashboard', {
    schema: { tags: ['Preços'], summary: 'Estatísticas do dashboard' },
    handler: getDashboardStats,
  })

  fastify.get('/compare/:productId', {
    schema: {
      tags: ['Preços'],
      summary: 'Comparar preços de um produto entre supermercados',
      params: z.object({ productId: z.string() }),
    },
    handler: compareProductPrices,
  })

  fastify.get('/history/:productId', {
    schema: {
      tags: ['Preços'],
      summary: 'Histórico de preços de um produto',
      params: z.object({ productId: z.string() }),
      querystring: z.object({ supermarketIds: z.string().optional() }),
    },
    handler: getPriceHistory,
  })

  fastify.get('/', {
    schema: {
      tags: ['Preços'],
      summary: 'Listar preços com paginação',
      querystring: z.object({
        productId: z.string().optional(),
        supermarketId: z.string().optional(),
        limit: z.string().optional(),
        offset: z.string().optional(),
      }),
    },
    handler: getPrices,
  })

  fastify.get('/:id', {
    schema: {
      tags: ['Preços'],
      summary: 'Obter preço por ID',
      params: z.object({ id: z.string() }),
    },
    handler: getPriceById,
  })

  fastify.post('/', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Preços'],
      summary: 'Registar preço',
      security: [{ bearerAuth: [] }],
      body: z.object({
        productId: z.number().int().positive(),
        supermarketId: z.number().int().positive(),
        price: z.number().positive(),
        quantity: z.number().positive().default(1),
        date: z.string().datetime().optional(),
        notes: z.string().nullable().optional(),
      }),
    },
    handler: createPrice,
  })

  fastify.put('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Preços'],
      summary: 'Atualizar preço',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string() }),
      body: z.object({
        productId: z.number().int().positive().optional(),
        supermarketId: z.number().int().positive().optional(),
        price: z.number().positive().optional(),
        quantity: z.number().positive().optional(),
        date: z.string().datetime().optional(),
        notes: z.string().nullable().optional(),
      }),
    },
    handler: updatePrice,
  })

  fastify.delete('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Preços'],
      summary: 'Eliminar preço',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string() }),
    },
    handler: deletePrice,
  })
}

export default pricesRoutes
