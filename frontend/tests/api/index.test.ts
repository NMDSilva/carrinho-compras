import { describe, it, expect, vi, beforeEach } from 'vitest'

const { instanceMock, createMock } = vi.hoisted(() => {
  const instanceMock = vi.fn().mockResolvedValue({})
  const createMock = vi.fn(() => instanceMock)
  return { instanceMock, createMock }
})

vi.mock('ofetch', () => ({
  $fetch: { create: createMock },
}))

describe('api client', () => {
  beforeEach(() => {
    instanceMock.mockClear()
    createMock.mockClear()
  })

  it('cria a instância com a baseURL /api', async () => {
    await import('@/api/index')
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: '/api' })
    )
  })

  it('productsApi.getAll chama /products com os parâmetros de pesquisa', async () => {
    const { productsApi } = await import('@/api/index')
    await productsApi.getAll({ search: 'leite' })
    expect(instanceMock).toHaveBeenCalledWith('/products', { query: { search: 'leite' } })
  })

  it('productsApi.delete chama DELETE /products/:id', async () => {
    const { productsApi } = await import('@/api/index')
    await productsApi.delete(7)
    expect(instanceMock).toHaveBeenCalledWith('/products/7', { method: 'DELETE' })
  })

  it('pricesApi.compare chama /prices/compare/:productId', async () => {
    const { pricesApi } = await import('@/api/index')
    await pricesApi.compare(3)
    expect(instanceMock).toHaveBeenCalledWith('/prices/compare/3')
  })
})
