import 'dotenv/config'
import Fastify, { FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod'
import { ZodError } from 'zod'

import authRoutes from './routes/auth.routes'
import adminRoutes from './routes/admin.routes'
import comprasRoutes from './routes/compras.routes'
import productsRoutes from './routes/products.routes'
import supermarketsRoutes from './routes/supermarkets.routes'
import pricesRoutes from './routes/prices.routes'

async function start() {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'development',
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, {
    origin: [
      'https://n8n.nmsilva.eu',
      process.env.NODE_ENV === 'production'
        ? 'https://carrinhodecompras.pt'
        : 'http://localhost:5173',
    ],
  })

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret',
  })

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Carrinho de Compras API',
        description: 'API para rastreio de preços de supermercado',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          apiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
        },
      },
    },
    transform: jsonSchemaTransform,
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
      } catch {
        reply.status(401).send({ error: 'Autenticação necessária' })
      }
    }
  )

  app.decorate(
    'authenticateAdmin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
        const user = request.user as { role: string }
        if (user.role !== 'ADMIN') {
          reply.status(403).send({ error: 'Acesso restrito a administradores' })
        }
      } catch {
        reply.status(401).send({ error: 'Autenticação necessária' })
      }
    }
  )

  app.setErrorHandler(
    (
      error: Error & { statusCode?: number },
      _request: FastifyRequest,
      reply: FastifyReply
    ) => {
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[${new Date().toISOString()}] ${error.name}: ${error.message}`
        )
      }
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        })
      }
      if (
        error.message?.includes('Record to update not found') ||
        error.message?.includes('Record to delete not found')
      ) {
        return reply.status(404).send({ error: 'Registo não encontrado' })
      }
      if (error.message?.includes('Unique constraint failed')) {
        return reply.status(409).send({ error: 'Registo já existe' })
      }
      if (error.statusCode) {
        return reply.status(error.statusCode).send({ error: error.message })
      }
      reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  )

  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(adminRoutes, { prefix: '/api/admin' })
  await app.register(comprasRoutes, { prefix: '/api/compras' })
  await app.register(productsRoutes, { prefix: '/api/products' })
  await app.register(supermarketsRoutes, { prefix: '/api/supermarkets' })
  await app.register(pricesRoutes, { prefix: '/api/prices' })

  const PORT = Number(process.env.PORT) || 3000
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`\n🛒 Carrinho de Compras API`)
  console.log(`   Servidor a correr em: http://localhost:${PORT}`)
  console.log(`   Docs disponíveis em:  http://localhost:${PORT}/docs`)
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
