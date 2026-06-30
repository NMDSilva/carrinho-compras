import { z } from 'zod'

export const supermarketBodySchema = z.object({
  name: z.string().min(1),
  location: z.string().nullable().optional(),
})

export type SupermarketInput = z.infer<typeof supermarketBodySchema>
