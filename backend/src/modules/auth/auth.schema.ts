import { z } from 'zod'

// Schemas de input partilhados (fonte única em @carrinho/shared)
export {
  registerSchema,
  loginSchema,
  updateMeSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@carrinho/shared'
export type {
  RegisterInput,
  LoginInput,
  UpdateMeInput,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '@carrinho/shared'

// Schemas de resposta (validação HTTP, específicos do backend)
export const userResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  theme: z.string(),
})

export const profileResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  theme: z.string(),
  createdAt: z.string(),
  // Só presente na resposta do PATCH quando a password muda: a mudança
  // invalida as sessões abertas (tokenVersion), e este é o token novo para o
  // cliente não se expulsar a si próprio. Nunca vem no GET /me.
  token: z.string().optional(),
})

export const messageResponseSchema = z.object({
  message: z.string(),
})
