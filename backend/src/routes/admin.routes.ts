import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
} from '../controllers/users.controller'
import { requireAdmin } from '../middleware/auth.middleware'

const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

const adminRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/users', {
    onRequest: [requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Listar todos os utilizadores',
      security: [{ bearerAuth: [] }],
      response: { 200: z.array(userSchema) },
    },
    handler: listUsers,
  })

  fastify.get('/users/:id', {
    onRequest: [requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Detalhes de um utilizador',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string() }),
      response: { 200: userSchema },
    },
    handler: getUser,
  })

  fastify.patch('/users/:id', {
    onRequest: [requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Atualizar utilizador',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string() }),
      body: z.object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        role: z.enum(['USER', 'ADMIN']).optional(),
        password: z.string().min(6).optional(),
      }),
      response: { 200: userSchema },
    },
    handler: updateUser,
  })

  fastify.delete('/users/:id', {
    onRequest: [requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Eliminar utilizador',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string() }),
    },
    handler: deleteUser,
  })
}

export default adminRoutes
