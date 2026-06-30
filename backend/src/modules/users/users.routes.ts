import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { listUsers, getUser, updateUser, deleteUser } from './users.controller'
import { requireAdmin } from '../../shared/middleware/auth.middleware'
import { updateUserSchema, userResponseSchema, userIdParamSchema } from './users.schema'

const usersRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/users', {
    onRequest: [requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Listar todos os utilizadores',
      security: [{ bearerAuth: [] }],
      response: { 200: z.array(userResponseSchema) },
    },
    handler: listUsers,
  })

  fastify.get('/users/:id', {
    onRequest: [requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Detalhes de um utilizador',
      security: [{ bearerAuth: [] }],
      params: userIdParamSchema,
      response: { 200: userResponseSchema },
    },
    handler: getUser,
  })

  fastify.patch('/users/:id', {
    onRequest: [requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Atualizar utilizador',
      security: [{ bearerAuth: [] }],
      params: userIdParamSchema,
      body: updateUserSchema,
      response: { 200: userResponseSchema },
    },
    handler: updateUser,
  })

  fastify.delete('/users/:id', {
    onRequest: [requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Eliminar utilizador',
      security: [{ bearerAuth: [] }],
      params: userIdParamSchema,
    },
    handler: deleteUser,
  })
}

export default usersRoutes
