import { $fetch } from 'ofetch'
import type {
  Product,
  Supermarket,
  PriceRecord,
  DashboardStats,
  CompareResult,
  PriceHistory,
  PaginatedPrices,
  User,
} from '@/types'

const api = $fetch.create({
  baseURL: '/api',
  onRequest({ options }) {
    const token = localStorage.getItem('token')
    if (token) {
      const h = new Headers(options.headers as HeadersInit)
      h.set('Authorization', `Bearer ${token}`)
      options.headers = h
    }
  },
  onResponseError({ response }) {
    if (response.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
  },
})

// Produtos
export const productsApi = {
  getAll: (params?: { search?: string; category?: string }) =>
    api<Product[]>('/products', { query: params }),
  getById: (id: number) => api<Product>(`/products/${id}`),
  getCategories: () => api<string[]>('/products/categories'),
  create: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | '_count' | 'prices'>) =>
    api<Product>('/products', { method: 'POST', body: data }),
  update: (id: number, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api<Product>(`/products/${id}`, { method: 'PUT', body: data }),
  delete: (id: number) => api(`/products/${id}`, { method: 'DELETE' }),
}

// Supermercados
export const supermarketsApi = {
  getAll: () => api<Supermarket[]>('/supermarkets'),
  getById: (id: number) => api<Supermarket>(`/supermarkets/${id}`),
  create: (data: Omit<Supermarket, 'id' | 'createdAt' | 'updatedAt' | '_count'>) =>
    api<Supermarket>('/supermarkets', { method: 'POST', body: data }),
  update: (id: number, data: Partial<Omit<Supermarket, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api<Supermarket>(`/supermarkets/${id}`, { method: 'PUT', body: data }),
  delete: (id: number) => api(`/supermarkets/${id}`, { method: 'DELETE' }),
}

// Admin — utilizadores
export const usersApi = {
  getAll: () => api<User[]>('/admin/users'),
  update: (id: number, data: Partial<Pick<User, 'name' | 'email' | 'role'> & { password?: string }>) =>
    api<User>(`/admin/users/${id}`, { method: 'PATCH', body: data }),
  delete: (id: number) => api(`/admin/users/${id}`, { method: 'DELETE' }),
}

// Preços
export const pricesApi = {
  getAll: (params?: { productId?: number; supermarketId?: number; limit?: number; offset?: number }) =>
    api<PaginatedPrices>('/prices', { query: params }),
  create: (data: {
    productId: number
    supermarketId: number
    price: number
    quantity?: number
    date?: string
    notes?: string
  }) => api<PriceRecord>('/prices', { method: 'POST', body: data }),
  update: (id: number, data: Partial<Omit<PriceRecord, 'id' | 'createdAt' | 'product' | 'supermarket'>>) =>
    api<PriceRecord>(`/prices/${id}`, { method: 'PUT', body: data }),
  delete: (id: number) => api(`/prices/${id}`, { method: 'DELETE' }),
  compare: (productId: number) => api<CompareResult>(`/prices/compare/${productId}`),
  history: (productId: number, supermarketIds?: number[]) =>
    api<PriceHistory>(`/prices/history/${productId}`, {
      query: supermarketIds?.length ? { supermarketIds: supermarketIds.join(',') } : {},
    }),
  dashboard: () => api<DashboardStats>('/prices/dashboard'),
}
