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
  variantIdParamSchema,
  priceListQuerySchema,
  priceHistoryQuerySchema,
} from './prices.schema'

const pricesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/dashboard', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Preços'],
      summary: 'Estatísticas do dashboard',
      security: [{ bearerAuth: [] }],
    },
    handler: getDashboardStats,
  })

  fastify.get('/compare/:productId', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Preços'],
      summary: 'Comparar preços de um produto entre supermercados',
      security: [{ bearerAuth: [] }],
      params: productIdParamSchema,
    },
    handler: compareProductPrices,
  })

  fastify.get('/history/:variantId', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Preços'],
      summary: 'Histórico de preços de uma variante',
      security: [{ bearerAuth: [] }],
      params: variantIdParamSchema,
      querystring: priceHistoryQuerySchema,
    },
    handler: getPriceHistory,
  })

  fastify.get('/', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Preços'],
      summary: 'Listar preços com paginação',
      security: [{ bearerAuth: [] }],
      querystring: priceListQuerySchema,
    },
    handler: getPrices,
  })

  fastify.get('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Preços'],
      summary: 'Obter preço por ID',
      security: [{ bearerAuth: [] }],
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
