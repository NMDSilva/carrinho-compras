export interface UserRef {
  id: number
  name: string
}

export interface Product {
  id: number
  name: string
  brand: string | null
  unit: string
  category: string | null
  createdAt: string
  updatedAt: string
  _count?: { prices: number }
  prices?: PriceRecord[]
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
  productId: number
  supermarketId: number
  price: number
  quantity: number
  date: string
  notes: string | null
  createdAt: string
  product?: Product
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
  }[]
}

export interface CompareResult {
  product: Product
  prices: PriceRecord[]
}

export interface HistoryGroup {
  supermarket: { id: number; name: string }
  records: { date: string; price: number }[]
}

export interface PriceHistory {
  product: Product
  history: HistoryGroup[]
}

export interface PaginatedPrices {
  data: PriceRecord[]
  total: number
}
