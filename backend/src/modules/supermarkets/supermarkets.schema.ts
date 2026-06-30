import { z } from 'zod'

// Schema de input partilhado (fonte única em @carrinho/shared)
export { supermarketBodySchema } from '@carrinho/shared'
export type { SupermarketInput } from '@carrinho/shared'

// Plumbing HTTP específico do backend
export const supermarketIdParamSchema = z.object({ id: z.string() })
