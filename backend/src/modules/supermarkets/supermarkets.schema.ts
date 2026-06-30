import { z } from 'zod'

export const supermarketBodySchema = z.object({
  name: z.string().min(1),
  location: z.string().nullable().optional(),
})

export const supermarketIdParamSchema = z.object({ id: z.string() })

export type SupermarketInput = z.infer<typeof supermarketBodySchema>
