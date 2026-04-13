import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { register, login, me, updateMe } from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth.middleware'

const userSchema = z.object({ id: z.number(), name: z.string(), email: z.string(), role: z.string() })

const authRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Registar novo utilizador',
      body: z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6) }),
      response: { 201: z.object({ token: z.string(), user: userSchema }) },
    },
    handler: register,
  })

  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Autenticar utilizador',
      body: z.object({ email: z.string().email(), password: z.string().min(1) }),
      response: { 200: z.object({ token: z.string(), user: userSchema }) },
    },
    handler: login,
  })

  fastify.get('/me', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Auth'],
      summary: 'Dados do utilizador autenticado',
      security: [{ bearerAuth: [] }],
      response: { 200: z.object({ id: z.number(), name: z.string(), email: z.string(), role: z.string(), createdAt: z.string() }) },
    },
    handler: me,
  })

  fastify.patch('/me', {
    onRequest: [requireAuth],
    schema: {
      tags: ['Auth'],
      summary: 'Atualizar perfil',
      security: [{ bearerAuth: [] }],
      body: z.object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(6).optional(),
      }),
      response: { 200: z.object({ id: z.number(), name: z.string(), email: z.string(), role: z.string(), createdAt: z.string() }) },
    },
    handler: updateMe,
  })
}

export default authRoutes
