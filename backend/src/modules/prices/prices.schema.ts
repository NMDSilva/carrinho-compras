import { z } from 'zod'

export const priceRecordSchema = z.object({
  productId: z.number().int().positive(),
  supermarketId: z.number().int().positive(),
  price: z.number().positive('Preço deve ser positivo'),
  quantity: z.number().positive().default(1),
  date: z.string().datetime().optional(),
  notes: z.string().nullable().optional(),
})

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
  productId: z.string().optional(),
  supermarketId: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
})

export const priceHistoryQuerySchema = z.object({ supermarketIds: z.string().optional() })

export type PriceRecordInput = z.infer<typeof priceRecordSchema>
