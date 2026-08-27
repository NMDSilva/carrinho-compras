import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../app'
import { prismaMock } from '../../../tests/mocks/prisma'
import { authHeader } from '../../../tests/helpers'

describe('prices routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('lista preços com paginação', async () => {
    prismaMock.priceRecord.findMany.mockResolvedValueOnce([])
    prismaMock.priceRecord.count.mockResolvedValueOnce(0)

    const res = await app.inject({ method: 'GET', url: '/api/prices' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ data: [], total: 0 })
  })

  it('aplica limit/offset por omissão quando não indicados', async () => {
    prismaMock.priceRecord.findMany.mockResolvedValueOnce([])
    prismaMock.priceRecord.count.mockResolvedValueOnce(0)

    await app.inject({ method: 'GET', url: '/api/prices' })

    expect(prismaMock.priceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 })
    )
  })

  it('rejeita limit acima do máximo permitido', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/prices?limit=99999' })
    expect(res.statusCode).toBe(400)
  })

  it('rejeita limit que não seja um número', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/prices?limit=abc' })
    expect(res.statusCode).toBe(400)
  })

  it('rejeita offset negativo', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/prices?offset=-5' })
    expect(res.statusCode).toBe(400)
  })

  it('aceita limit/offset válidos dentro do intervalo permitido', async () => {
    prismaMock.priceRecord.findMany.mockResolvedValueOnce([])
    prismaMock.priceRecord.count.mockResolvedValueOnce(0)

    const res = await app.inject({ method: 'GET', url: '/api/prices?limit=50&offset=10' })

    expect(res.statusCode).toBe(200)
    expect(prismaMock.priceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, skip: 10 })
    )
  })

  it('devolve 404 para preço inexistente', async () => {
    prismaMock.priceRecord.findUnique.mockResolvedValueOnce(null)

    const res = await app.inject({ method: 'GET', url: '/api/prices/999' })

    expect(res.statusCode).toBe(404)
  })

  it('cria preço autenticado', async () => {
    prismaMock.priceRecord.create.mockResolvedValueOnce({
      id: 1,
      productId: 1,
      supermarketId: 1,
      price: 1.5,
      quantity: 1,
    } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/prices',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
      payload: { productId: 1, supermarketId: 1, price: 1.5 },
    })

    expect(res.statusCode).toBe(201)
  })

  it('rejeita criação de preço sem autenticação', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/prices',
      payload: { productId: 1, supermarketId: 1, price: 1.5 },
    })

    expect(res.statusCode).toBe(401)
  })

  it('rejeita preço negativo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/prices',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
      payload: { productId: 1, supermarketId: 1, price: -1 },
    })

    expect(res.statusCode).toBe(400)
  })

  it('compara preços de um produto', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({ id: 1, name: 'Leite' } as never)
    prismaMock.priceRecord.findMany.mockResolvedValueOnce([])

    const res = await app.inject({ method: 'GET', url: '/api/prices/compare/1' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ prices: [] })
  })

  it('elimina preço próprio', async () => {
    prismaMock.priceRecord.findUnique.mockResolvedValueOnce({ id: 1, createdById: 1 } as never)
    prismaMock.priceRecord.delete.mockResolvedValueOnce({} as never)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/prices/1',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
    })

    expect(res.statusCode).toBe(204)
  })

  it('rejeita eliminação de preço de outro utilizador', async () => {
    prismaMock.priceRecord.findUnique.mockResolvedValueOnce({ id: 1, createdById: 2 } as never)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/prices/1',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
    })

    expect(res.statusCode).toBe(403)
  })

  it('admin elimina preço de outro utilizador', async () => {
    prismaMock.priceRecord.findUnique.mockResolvedValueOnce({ id: 1, createdById: 2 } as never)
    prismaMock.priceRecord.delete.mockResolvedValueOnce({} as never)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/prices/1',
      headers: authHeader(app, { sub: 99, role: 'ADMIN' }),
    })

    expect(res.statusCode).toBe(204)
  })

  it('devolve estatísticas do dashboard', async () => {
    prismaMock.product.count.mockResolvedValueOnce(2)
    prismaMock.supermarket.count.mockResolvedValueOnce(1)
    prismaMock.priceRecord.count.mockResolvedValueOnce(3)
    prismaMock.priceRecord.findMany.mockResolvedValueOnce([])
    prismaMock.$queryRaw.mockResolvedValueOnce([])

    const res = await app.inject({ method: 'GET', url: '/api/prices/dashboard' })

    expect(res.statusCode).toBe(200)
    expect(res.json().stats).toMatchObject({ totalProducts: 2, totalSupermarkets: 1, totalPrices: 3 })
  })
})
