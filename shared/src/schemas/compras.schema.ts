import { z } from 'zod'

// O regex garante o formato, mas não que a data exista: `32/13/2026` passava e
// só rebentava mais à frente, ao construir o `Date` (500 em vez de 400).
function isDataValida(valor: string) {
  const [dia, mes, ano] = valor.split('/').map(Number)
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  return (
    d.getUTCFullYear() === ano &&
    d.getUTCMonth() === mes - 1 &&
    d.getUTCDate() === dia
  )
}

export const comprasSchemaRequest = z.object({
  fatura: z.string().min(1).max(120),
  data: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Formato de data esperado: DD/MM/YYYY')
    .refine(isDataValida, 'Data inexistente no calendário'),
  local: z.string().min(1).max(200),
  email: z.string().email(),
  total: z.number(),
  produtos: z
    .array(
      z.object({
        produto: z.string().min(1).max(300),
        valor: z.number().min(0),
      })
    )
    .min(1)
    // Uma fatura de supermercado não chega perto disto; o limite existe só para
    // um pedido absurdo não pôr a transação a criar milhares de registos.
    .max(500),
})

export const comprasSchemaResponse = z.object({
  supermarketId: z.number(),
  productsCreated: z.number(),
  pricesCreated: z.number(),
  // true quando esta fatura já tinha sido registada antes: nada foi criado
  // agora (os contadores vêm a 0) e `records` traz os registos da importação
  // original. Permite ao n8n distinguir um retry de uma importação nova.
  alreadyImported: z.boolean(),
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
