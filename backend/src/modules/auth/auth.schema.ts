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
})

export const profileResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  createdAt: z.string(),
})

export const messageResponseSchema = z.object({
  message: z.string(),
})
