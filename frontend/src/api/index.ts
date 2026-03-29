import axios from 'axios'
import type {
  Product,
  Supermarket,
  PriceRecord,
  DashboardStats,
  CompareResult,
  PriceHistory,
  PaginatedPrices,
} from '@/types'

const api = axios.create({ baseURL: '/api' })

// Injeta o token JWT em todos os pedidos autenticados
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Se o servidor devolver 401, limpa o token
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Produtos
export const productsApi = {
  getAll: (params?: { search?: string; category?: string }) =>
    api.get<Product[]>('/products', { params }).then((r) => r.data),
  getById: (id: number) => api.get<Product>(`/products/${id}`).then((r) => r.data),
  getCategories: () => api.get<string[]>('/products/categories').then((r) => r.data),
  create: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | '_count' | 'prices'>) =>
    api.post<Product>('/products', data).then((r) => r.data),
  update: (id: number, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<Product>(`/products/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/products/${id}`),
}

// Supermercados
export const supermarketsApi = {
  getAll: () => api.get<Supermarket[]>('/supermarkets').then((r) => r.data),
  getById: (id: number) => api.get<Supermarket>(`/supermarkets/${id}`).then((r) => r.data),
  create: (data: Omit<Supermarket, 'id' | 'createdAt' | 'updatedAt' | '_count'>) =>
    api.post<Supermarket>('/supermarkets', data).then((r) => r.data),
  update: (id: number, data: Partial<Omit<Supermarket, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<Supermarket>(`/supermarkets/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/supermarkets/${id}`),
}

// Preços
export const pricesApi = {
  getAll: (params?: { productId?: number; supermarketId?: number; limit?: number; offset?: number }) =>
    api.get<PaginatedPrices>('/prices', { params }).then((r) => r.data),
  create: (data: {
    productId: number
    supermarketId: number
    price: number
    quantity?: number
    date?: string
    notes?: string
  }) => api.post<PriceRecord>('/prices', data).then((r) => r.data),
  update: (id: number, data: Partial<Omit<PriceRecord, 'id' | 'createdAt' | 'product' | 'supermarket'>>) =>
    api.put<PriceRecord>(`/prices/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/prices/${id}`),
  compare: (productId: number) =>
    api.get<CompareResult>(`/prices/compare/${productId}`).then((r) => r.data),
  history: (productId: number, supermarketIds?: number[]) =>
    api
      .get<PriceHistory>(`/prices/history/${productId}`, {
        params: supermarketIds?.length ? { supermarketIds: supermarketIds.join(',') } : {},
      })
      .then((r) => r.data),
  dashboard: () => api.get<DashboardStats>('/prices/dashboard').then((r) => r.data),
}
