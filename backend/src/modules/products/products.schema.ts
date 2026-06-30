import { z } from 'zod'

export const productBodySchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  unit: z.string().min(1),
  category: z.string().nullable().optional(),
})

export const productIdParamSchema = z.object({ id: z.string() })

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
})

export type ProductInput = z.infer<typeof productBodySchema>
