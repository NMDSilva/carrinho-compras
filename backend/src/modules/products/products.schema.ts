import { z } from 'zod'

// Schemas de input partilhados (fonte única em @carrinho/shared)
export {
  productBodySchema,
  variantBodySchema,
  variantReassignSchema,
} from '@carrinho/shared'
export type {
  ProductInput,
  VariantInput,
  VariantReassignInput,
} from '@carrinho/shared'

// Plumbing HTTP específico do backend
export const productIdParamSchema = z.object({ id: z.string() })
export const variantIdParamSchema = z.object({ id: z.string() })
export const productVariantsParamSchema = z.object({ productId: z.string() })

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  needsReview: z.coerce.boolean().optional(),
  // Ceiling igual ao anterior take:500 fixo — por omissão devolve tudo até
  // esse limite (comportamento inalterado para quem não pagina), mas
  // ProductsView.vue já pede limit/offset menores para paginação real.
  limit: z.coerce.number().int().positive().max(500).default(500),
  offset: z.coerce.number().int().min(0).default(0),
})
