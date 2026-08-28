import { z } from 'zod'

export const productBodySchema = z.object({
  name: z.string().min(1),
  category: z.string().nullable().optional(),
})

export type ProductInput = z.infer<typeof productBodySchema>

// Variante de um Product genérico (marca + tamanho de embalagem + unidade,
// ex: brand="Sidul", packageSize=1, unit="kg" → "Sidul 1Kg"). packCount
// distingue um multipack de um pack simples do mesmo tamanho/marca
// (ex: "3X210G" → packageSize=210, packCount=3, mostrado como "3×210g").
export const variantBodySchema = z.object({
  brand: z.string().nullable().optional(),
  packageSize: z.number().positive().nullable().optional(),
  packCount: z.number().int().positive().nullable().optional(),
  unit: z.string().min(1),
})

export type VariantInput = z.infer<typeof variantBodySchema>

// Reatribuir uma variante para outro Product genérico (ferramenta de
// arrumação manual usada na fila de "produtos por rever").
export const variantReassignSchema = z.object({
  productId: z.number().int().positive(),
})

export type VariantReassignInput = z.infer<typeof variantReassignSchema>
