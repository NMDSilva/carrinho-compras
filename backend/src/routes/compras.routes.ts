import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { registarCompra } from '../controllers/compras.controller'
import { requireApiKey } from '../middleware/apiKey.middleware'

const comprasRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/', {
    onRequest: [requireApiKey],
    schema: {
      tags: ['Compras'],
      summary: 'Registar compra via N8N',
      security: [{ apiKey: [] }],
      body: z.object({
        data: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
        local: z.string().min(1),
        total: z.number(),
        items: z.array(z.object({
          produto: z.string().min(1),
          valor: z.number().min(0),
          desconto: z.number().min(0).default(0),
        })).min(1),
      }),
      response: {
        201: z.object({
          supermarketId: z.number(),
          productsCreated: z.number(),
          pricesCreated: z.number(),
          records: z.array(z.object({ product: z.string(), price: z.number(), priceRecordId: z.number() })),
        }),
      },
    },
    handler: registarCompra,
  })
}

export default comprasRoutes
