import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { getVariant, updateVariant, deleteVariant, reassignVariant } from './products.controller'
import { requireAuth } from '../../shared/middleware/auth.middleware'
import { variantIdParamSchema, variantBodySchema, variantReassignSchema } from './products.schema'

// Registado à parte de productsRoutes (prefixo /api/variants) para não criar
// ambiguidade Fastify entre /api/products/:id (produto) e uma rota de
// variante por id.
const variantsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Produtos'],
      summary: 'Detalhes de uma variante',
      security: [{ bearerAuth: [] }],
      params: variantIdParamSchema,
    },
    handler: getVariant,
  })

  fastify.put('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Produtos'],
      summary: 'Atualizar variante',
      security: [{ bearerAuth: [] }],
      params: variantIdParamSchema,
      body: variantBodySchema.partial(),
    },
    handler: updateVariant,
  })

  fastify.delete('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Produtos'],
      summary: 'Eliminar variante',
      security: [{ bearerAuth: [] }],
      params: variantIdParamSchema,
    },
    handler: deleteVariant,
  })

  fastify.patch('/:id/reassign', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Produtos'],
      summary: 'Reatribuir variante para outro produto genérico',
      security: [{ bearerAuth: [] }],
      params: variantIdParamSchema,
      body: variantReassignSchema,
    },
    handler: reassignVariant,
  })
}

export default variantsRoutes
