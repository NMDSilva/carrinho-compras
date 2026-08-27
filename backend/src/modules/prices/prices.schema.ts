import { z } from 'zod'

// Schema de input partilhado (fonte única em @carrinho/shared)
export { priceRecordSchema } from '@carrinho/shared'
export type { PriceRecordInput } from '@carrinho/shared'

// Plumbing HTTP específico do backend (validação de rotas / OpenAPI)
export const priceCreateBodySchema = z.object({
  productId: z.number().int().positive(),
  supermarketId: z.number().int().positive(),
  price: z.number().positive(),
  quantity: z.number().positive().default(1),
  date: z.string().datetime().optional(),
  notes: z.string().nullable().optional(),
})

export const priceUpdateBodySchema = z.object({
  productId: z.number().int().positive().optional(),
  supermarketId: z.number().int().positive().optional(),
  price: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  date: z.string().datetime().optional(),
  notes: z.string().nullable().optional(),
})

export const priceIdParamSchema = z.object({ id: z.string() })
export const productIdParamSchema = z.object({ productId: z.string() })

export const priceListQuerySchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  supermarketId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const priceHistoryQuerySchema = z.object({ supermarketIds: z.string().optional() })
