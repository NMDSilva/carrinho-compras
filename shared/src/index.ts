// Fonte única de verdade para schemas (validação) e tipos partilhados
// entre o backend e o frontend.

// Schemas de validação (zod) + tipos inferidos
export * from './schemas/auth.schema'
export * from './schemas/users.schema'
export * from './schemas/products.schema'
export * from './schemas/supermarkets.schema'
export * from './schemas/prices.schema'
export * from './schemas/compras.schema'

// Tipos de entidades (DTOs da API)
export * from './types/entities'
