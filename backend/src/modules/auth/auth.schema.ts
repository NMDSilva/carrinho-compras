import { z } from 'zod'

// Schemas de input partilhados (fonte única em @carrinho/shared)
export { registerSchema, loginSchema, updateMeSchema } from '@carrinho/shared'
export type { RegisterInput, LoginInput, UpdateMeInput } from '@carrinho/shared'

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
