import { z } from 'zod'

export const priceRecordSchema = z.object({
  variantId: z.number().int().positive(),
  supermarketId: z.number().int().positive(),
  price: z.number().positive('Preço deve ser positivo'),
  quantity: z.number().positive().default(1),
  date: z.string().datetime().optional(),
  notes: z.string().nullable().optional(),
})

export type PriceRecordInput = z.infer<typeof priceRecordSchema>
