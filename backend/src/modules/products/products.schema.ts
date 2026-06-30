import { z } from 'zod'

// Schema de input partilhado (fonte única em @carrinho/shared)
export { productBodySchema } from '@carrinho/shared'
export type { ProductInput } from '@carrinho/shared'

// Plumbing HTTP específico do backend
export const productIdParamSchema = z.object({ id: z.string() })

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
})
