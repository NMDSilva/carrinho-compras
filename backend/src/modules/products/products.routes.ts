import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  getProducts,
  getProduct,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
} from './products.controller'
import { requireAuth } from '../../shared/middleware/auth.middleware'
import { productBodySchema, productIdParamSchema, productQuerySchema } from './products.schema'

const productsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/categories', {
    schema: {
      tags: ['Produtos'],
      summary: 'Listar categorias',
      response: { 200: z.array(z.string()) },
    },
    handler: getCategories,
  })

  fastify.get('/', {
    schema: {
      tags: ['Produtos'],
      summary: 'Listar produtos',
      querystring: productQuerySchema,
    },
    handler: getProducts,
  })

  fastify.get('/:id', {
    schema: {
      tags: ['Produtos'],
      summary: 'Detalhes de um produto',
      params: productIdParamSchema,
    },
    handler: getProduct,
  })

  fastify.post('/', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Produtos'],
      summary: 'Criar produto',
      security: [{ bearerAuth: [] }],
      body: productBodySchema,
    },
    handler: createProduct,
  })

  fastify.put('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Produtos'],
      summary: 'Atualizar produto',
      security: [{ bearerAuth: [] }],
      params: productIdParamSchema,
      body: productBodySchema.partial(),
    },
    handler: updateProduct,
  })

  fastify.delete('/:id', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Produtos'],
      summary: 'Eliminar produto',
      security: [{ bearerAuth: [] }],
      params: productIdParamSchema,
    },
    handler: deleteProduct,
  })
}

export default productsRoutes
