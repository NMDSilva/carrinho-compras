import { z } from 'zod'

// Schemas de input partilhados (fonte única em @carrinho/shared)
export { productBodySchema, variantBodySchema, variantReassignSchema } from '@carrinho/shared'
export type { ProductInput, VariantInput, VariantReassignInput } from '@carrinho/shared'

// Plumbing HTTP específico do backend
export const productIdParamSchema = z.object({ id: z.string() })
export const variantIdParamSchema = z.object({ id: z.string() })
export const productVariantsParamSchema = z.object({ productId: z.string() })

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  needsReview: z.coerce.boolean().optional(),
})
