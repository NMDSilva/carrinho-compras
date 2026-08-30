import { $fetch } from 'ofetch'
import type {
  Product,
  ProductVariant,
  Supermarket,
  PriceRecord,
  DashboardStats,
  CompareResult,
  PriceHistory,
  PaginatedPrices,
  PaginatedProducts,
  User,
  AuthUser,
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
      const redirect = encodeURIComponent(
        window.location.pathname + window.location.search
      )
      window.location.href = `/login?redirect=${redirect}`
    }
  },
})

// Autenticação
export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  // Conta fica por confirmar até se clicar no link do email — sem login automático.
  register: (name: string, email: string, password: string) =>
    api<{ message: string }>('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    }),
  me: () => api<AuthUser>('/auth/me'),
  updateMe: (data: {
    name?: string
    email?: string
    currentPassword?: string
    newPassword?: string
  }) => api<AuthUser>('/auth/me', { method: 'PATCH', body: data }),
  verifyEmail: (token: string) =>
    api<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: { token },
    }),
  resendVerification: (email: string) =>
    api<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: { email },
    }),
  forgotPassword: (email: string) =>
    api<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  resetPassword: (token: string, newPassword: string) =>
    api<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    }),
}

// Produtos
export const productsApi = {
  getAll: (params?: {
    search?: string
    category?: string
    needsReview?: boolean
    limit?: number
    offset?: number
  }) => api<PaginatedProducts>('/products', { query: params }),
  getById: (id: number) => api<Product>(`/products/${id}`),
  getCategories: () => api<string[]>('/products/categories'),
  create: (data: { name: string; category?: string | null }) =>
    api<Product>('/products', { method: 'POST', body: data }),
  update: (
    id: number,
    data: Partial<{ name: string; category: string | null }>
  ) => api<Product>(`/products/${id}`, { method: 'PUT', body: data }),
  delete: (id: number) => api(`/products/${id}`, { method: 'DELETE' }),
  markReviewed: (id: number) =>
    api<Product>(`/products/${id}/review`, { method: 'PATCH' }),
}

// Variantes de produto (marca + tamanho de embalagem + unidade)
export const variantsApi = {
  getByProduct: (productId: number) =>
    api<ProductVariant[]>(`/products/${productId}/variants`),
  getById: (id: number) => api<ProductVariant>(`/variants/${id}`),
  create: (
    productId: number,
    data: {
      brand?: string | null
      packageSize?: number | null
      packCount?: number | null
      unit: string
    }
  ) =>
    api<ProductVariant>(`/products/${productId}/variants`, {
      method: 'POST',
      body: data,
    }),
  update: (
    id: number,
    data: Partial<{
      brand: string | null
      packageSize: number | null
      packCount: number | null
      unit: string
    }>
  ) => api<ProductVariant>(`/variants/${id}`, { method: 'PUT', body: data }),
  delete: (id: number) => api(`/variants/${id}`, { method: 'DELETE' }),
  reassign: (id: number, productId: number) =>
    api<ProductVariant>(`/variants/${id}/reassign`, {
      method: 'PATCH',
      body: { productId },
    }),
}

// Supermercados
export const supermarketsApi = {
  getAll: () => api<Supermarket[]>('/supermarkets'),
  getById: (id: number) => api<Supermarket>(`/supermarkets/${id}`),
  create: (
    data: Omit<Supermarket, 'id' | 'createdAt' | 'updatedAt' | '_count'>
  ) => api<Supermarket>('/supermarkets', { method: 'POST', body: data }),
  update: (
    id: number,
    data: Partial<Omit<Supermarket, 'id' | 'createdAt' | 'updatedAt'>>
  ) => api<Supermarket>(`/supermarkets/${id}`, { method: 'PUT', body: data }),
  delete: (id: number) => api(`/supermarkets/${id}`, { method: 'DELETE' }),
}

// Admin — utilizadores
export const usersApi = {
  getAll: () => api<User[]>('/admin/users'),
  update: (
    id: number,
    data: Partial<Pick<User, 'name' | 'email' | 'role'> & { password?: string }>
  ) => api<User>(`/admin/users/${id}`, { method: 'PATCH', body: data }),
  delete: (id: number) => api(`/admin/users/${id}`, { method: 'DELETE' }),
}

// Preços
export const pricesApi = {
  getAll: (params?: {
    variantId?: number
    productId?: number
    supermarketId?: number
    limit?: number
    offset?: number
  }) => api<PaginatedPrices>('/prices', { query: params }),
  getById: (id: number) => api<PriceRecord>(`/prices/${id}`),
  create: (data: {
    variantId: number
    supermarketId: number
    price: number
    quantity?: number
    date?: string
    notes?: string
  }) => api<PriceRecord>('/prices', { method: 'POST', body: data }),
  update: (
    id: number,
    data: Partial<
      Omit<PriceRecord, 'id' | 'createdAt' | 'variant' | 'supermarket'>
    >
  ) => api<PriceRecord>(`/prices/${id}`, { method: 'PUT', body: data }),
  delete: (id: number) => api(`/prices/${id}`, { method: 'DELETE' }),
  compare: (productId: number) =>
    api<CompareResult>(`/prices/compare/${productId}`),
  history: (variantId: number, supermarketIds?: number[]) =>
    api<PriceHistory>(`/prices/history/${variantId}`, {
      query: supermarketIds?.length
        ? { supermarketIds: supermarketIds.join(',') }
        : {},
    }),
  dashboard: () => api<DashboardStats>('/prices/dashboard'),
}
