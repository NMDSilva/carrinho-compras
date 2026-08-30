export type Role = 'USER' | 'ADMIN'

export interface UserRef {
  id: number
  name: string
}

export interface User {
  id: number
  name: string
  email: string
  role: Role
  createdAt: string
  updatedAt: string
}

/** Utilizador na sessão (resposta de login/registo e /auth/me). */
export interface AuthUser {
  id: number
  name: string
  email: string
  role: Role
}

export interface Product {
  id: number
  name: string
  category: string | null
  needsReview: boolean
  createdAt: string
  updatedAt: string
  variants?: ProductVariant[]
  createdBy?: UserRef | null
  updatedBy?: UserRef | null
}

/** Variante de um Product genérico: marca + tamanho de embalagem + unidade
 * (ex: brand="Sidul", packageSize=1, unit="kg" → "Sidul 1Kg"). packCount
 * distingue um multipack de um pack simples do mesmo tamanho/marca
 * (ex: "3X210G" → packageSize=210, packCount=3 → "3×210g"). */
export interface ProductVariant {
  id: number
  productId: number
  brand: string | null
  packageSize: number | null
  packCount: number | null
  unit: string
  createdAt: string
  updatedAt: string
  _count?: { prices: number }
  prices?: PriceRecord[]
  product?: Product
  createdBy?: UserRef | null
  updatedBy?: UserRef | null
}

export interface Supermarket {
  id: number
  name: string
  location: string | null
  createdAt: string
  updatedAt: string
  _count?: { prices: number }
  createdBy?: UserRef | null
  updatedBy?: UserRef | null
}

export interface PriceRecord {
  id: number
  variantId: number
  supermarketId: number
  price: number
  quantity: number
  date: string
  notes: string | null
  createdAt: string
  variant?: ProductVariant
  supermarket?: Supermarket
  createdBy?: UserRef | null
  updatedBy?: UserRef | null
}

export interface DashboardStats {
  stats: {
    totalProducts: number
    totalSupermarkets: number
    totalPrices: number
  }
  recentPrices: PriceRecord[]
  cheapestByProduct: {
    productId: number
    productName: string
    minPrice: number
    supermarketName: string
    date: string
    variantBrand: string | null
    variantUnit: string
  }[]
}

/** Comparação de preços de um produto genérico entre supermercados/marcas —
 * ao nível do Product (várias variantes podem aparecer). */
export interface CompareResult {
  product: Product
  prices: PriceRecord[]
}

export interface HistoryGroup {
  supermarket: { id: number; name: string }
  records: { date: string; price: number }[]
}

/** Histórico de preços de uma variante específica — misturar marcas na mesma
 * série temporal seria enganador, por isso é sempre ao nível da variante. */
export interface PriceHistory {
  variant: ProductVariant
  history: HistoryGroup[]
}

export interface PaginatedPrices {
  data: PriceRecord[]
  total: number
}

export interface PaginatedProducts {
  data: Product[]
  total: number
}
