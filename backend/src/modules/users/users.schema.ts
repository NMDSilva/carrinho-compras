import { z } from 'zod'

// Schema de input partilhado (fonte única em @carrinho/shared)
export { updateUserSchema } from '@carrinho/shared'
export type { UpdateUserInput } from '@carrinho/shared'

// Plumbing HTTP específico do backend
export const userResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const userIdParamSchema = z.object({ id: z.string() })
