import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import {
  getPrices,
  getPriceById,
  createPrice,
  updatePrice,
  deletePrice,
  compareProductPrices,
  getPriceHistory,
  getDashboardStats,
} from './prices.controller'
import { requireAuth } from '../../shared/middleware/auth.middleware'
import {
  priceCreateBodySchema,
  priceUpdateBodySchema,
  priceIdParamSchema,
  productIdParamSchema,
  priceListQuerySchema,
  priceHistoryQuerySchema,
} from './prices.schema'

const pricesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/dashboard', {
    schema: { tags: ['Preços'], summary: 'Estatísticas do dashboard' },
    handler: getDashboardStats,
  })

  fastify.get('/compare/:productId', {
    schema: {
      tags: ['Preços'],
      summary: 'Comparar preços de um produto entre supermercados',
      params: productIdParamSchema,
    },
    handler: compareProductPrices,
  })

  fastify.get('/history/:productId', {
    schema: {
      tags: ['Preços'],
      summary: 'Histórico de preços de um produto',
      params: productIdParamSchema,
      querystring: priceHistoryQuerySchema,
    },
    handler: getPriceHistory,
  })

  fastify.get('/', {
    schema: {
      tags: ['Preços'],
      summary: 'Listar preços com paginação',
      querystring: priceListQuerySchema,
    },
    handler: getPrices,
  })

  fastify.get('/:id', {
    schema: {
      tags: ['Preços'],
      summary: 'Obter preço por ID',
      params: priceIdParamSchema,
    },
    handler: getPriceById,
  })

  fastify.post('/', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Preços'],
      summary: 'Registar preço',
      security: [{ bearerAuth: [] }],
      body: priceCreateBodySchema,
    },
    handler: createPrice,
  })

  fastify.put('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Preços'],
      summary: 'Atualizar preço',
      security: [{ bearerAuth: [] }],
      params: priceIdParamSchema,
      body: priceUpdateBodySchema,
    },
    handler: updatePrice,
  })

  fastify.delete('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Preços'],
      summary: 'Eliminar preço',
      security: [{ bearerAuth: [] }],
      params: priceIdParamSchema,
    },
    handler: deletePrice,
  })
}

export default pricesRoutes
