import z from 'zod'

export const productBodySchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  unit: z.string().min(1),
  category: z.string().nullable().optional(),
})
