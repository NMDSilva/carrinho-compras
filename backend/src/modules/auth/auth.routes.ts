import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import {
  register,
  login,
  me,
  updateMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from './auth.controller'
import { requireAuth } from '../../shared/middleware/auth.middleware'
import {
  registerSchema,
  loginSchema,
  updateMeSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  userResponseSchema,
  profileResponseSchema,
  messageResponseSchema,
} from './auth.schema'
import { z } from 'zod'

const authRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Registar novo utilizador (fica por confirmar até clicar no link do email)',
      body: registerSchema,
      response: { 201: messageResponseSchema },
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

  fastify.post('/verify-email', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Confirmar email a partir do token recebido por email',
      body: verifyEmailSchema,
      response: { 200: messageResponseSchema },
    },
    handler: verifyEmail,
  })

  fastify.post('/resend-verification', {
    config: { rateLimit: { max: 3, timeWindow: '5 minutes' } },
    schema: {
      tags: ['Auth'],
      summary: 'Reenviar o email de confirmação',
      body: resendVerificationSchema,
      response: { 200: messageResponseSchema },
    },
    handler: resendVerification,
  })

  fastify.post('/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '5 minutes' } },
    schema: {
      tags: ['Auth'],
      summary: 'Pedir email de reposição de password',
      body: forgotPasswordSchema,
      response: { 200: messageResponseSchema },
    },
    handler: forgotPassword,
  })

  fastify.post('/reset-password', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Repor password a partir do token recebido por email',
      body: resetPasswordSchema,
      response: { 200: messageResponseSchema },
    },
    handler: resetPassword,
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
