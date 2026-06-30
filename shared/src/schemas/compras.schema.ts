import { z } from 'zod'

export const comprasSchemaRequest = z.object({
  fatura: z.string().min(1),
  data: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Formato de data esperado: DD/MM/YYYY'),
  local: z.string().min(1),
  email: z.string().email(),
  total: z.number(),
  produtos: z
    .array(
      z.object({
        produto: z.string().min(1),
        valor: z.number().min(0),
      })
    )
    .min(1),
})

export const comprasSchemaResponse = z.object({
  supermarketId: z.number(),
  productsCreated: z.number(),
  pricesCreated: z.number(),
  records: z.array(
    z.object({
      product: z.string(),
      price: z.number(),
      priceRecordId: z.number(),
    })
  ),
})

export type ComprasRequest = z.infer<typeof comprasSchemaRequest>
export type ComprasResponse = z.infer<typeof comprasSchemaResponse>
