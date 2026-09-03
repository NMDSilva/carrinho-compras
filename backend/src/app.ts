import Fastify, { FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

import prisma from './shared/lib/prisma'
import authRoutes from './modules/auth/auth.routes'
import usersRoutes from './modules/users/users.routes'
import comprasRoutes from './modules/compras/compras.routes'
import productsRoutes from './modules/products/products.routes'
import variantsRoutes from './modules/products/variants.routes'
import supermarketsRoutes from './modules/supermarkets/supermarkets.routes'
import pricesRoutes from './modules/prices/prices.routes'

export async function buildApp() {
  const app = Fastify({
    // Sem log em testes (ruído); nível mais verboso em dev, mais contido em produção.
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' },
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

  await app.register(helmet, {
    // CSP teria de ser afinada para a Swagger UI conseguir correr (scripts/estilos
    // inline) — como /docs só existe fora de produção, mais simples desligar a CSP
    // aí e manter a predefinição estrita do helmet em produção, onde /docs não existe.
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  })

  // Sem fallback de propósito. Isto já caía silenciosamente para 'dev-secret' —
  // um valor previsível, e agora público no histórico do repositório. Com ele,
  // qualquer pessoa forja um token válido para qualquer utilizador, incluindo
  // ADMIN. Falhar a arrancar é o comportamento correto: em produção a variável
  // vem do .env, e nos testes de `tests/setup.ts`.
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET não está definida. Copia backend/.env.example para backend/.env e preenche-a.'
    )
  }
  await app.register(jwt, { secret: process.env.JWT_SECRET })

  // Sem limite global — só nas rotas que o configuram explicitamente (login/registo).
  await app.register(rateLimit, { global: false })

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
  // Documentação da API não fica exposta publicamente em produção.
  if (process.env.NODE_ENV !== 'production') {
    await app.register(swaggerUi, { routePrefix: '/docs' })
  }

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
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      request.log.error({ err: error }, `${error.name}: ${error.message}`)
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2025':
            return reply.status(404).send({ error: 'Registo não encontrado' })
          case 'P2002':
            return reply.status(409).send({ error: 'Registo já existe' })
          case 'P2003':
            return reply
              .status(400)
              .send({ error: 'Referência inválida — o registo relacionado não existe' })
        }
      }
      if (error.statusCode) {
        return reply.status(error.statusCode).send({ error: error.message })
      }
      reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  )

  // Público de propósito — é o healthcheck do deploy e da monitorização.
  // Toca mesmo na base de dados: antes devolvia um objeto estático, por isso
  // uma app de pé mas sem ligação à BD (ex: password errada no .env) passava o
  // gate do deploy e ficava inútil em silêncio (AUDITORIA.md, 31/08/2026).
  app.get('/api/health', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (err) {
      request.log.error({ err }, 'healthcheck: base de dados inacessível')
      return reply.status(503).send({
        status: 'error',
        database: 'unreachable',
        timestamp: new Date().toISOString(),
      })
    }
    return {
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
    }
  })

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(usersRoutes, { prefix: '/api/admin' })
  await app.register(comprasRoutes, { prefix: '/api/compras' })
  await app.register(productsRoutes, { prefix: '/api/products' })
  await app.register(variantsRoutes, { prefix: '/api/variants' })
  await app.register(supermarketsRoutes, { prefix: '/api/supermarkets' })
  await app.register(pricesRoutes, { prefix: '/api/prices' })

  return app
}
