import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { register, login, me, updateMe } from './auth.controller'
import { requireAuth } from '../../shared/middleware/auth.middleware'
import {
  registerSchema,
  loginSchema,
  updateMeSchema,
  userResponseSchema,
  profileResponseSchema,
} from './auth.schema'
import { z } from 'zod'

const authRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Registar novo utilizador',
      body: registerSchema,
      response: { 201: z.object({ token: z.string(), user: userResponseSchema }) },
    },
    handler: register,
  })

  fastify.post('/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Autenticar utilizador',
      body: loginSchema,
      response: { 200: z.object({ token: z.string(), user: userResponseSchema }) },
    },
    handler: login,
  })

  fastify.get('/me', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Auth'],
      summary: 'Dados do utilizador autenticado',
      security: [{ bearerAuth: [] }],
      response: { 200: profileResponseSchema },
    },
    handler: me,
  })

  fastify.patch('/me', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Auth'],
      summary: 'Atualizar perfil',
      security: [{ bearerAuth: [] }],
      body: updateMeSchema,
      response: { 200: profileResponseSchema },
    },
    handler: updateMe,
  })
}

export default authRoutes
