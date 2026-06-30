import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { prismaMock } from './mocks/prisma'

describe('compras routes (N8N)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    process.env.N8N_API_KEY = 'test-api-key'
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  const payload = {
    fatura: 'FAT-001',
    data: '15/06/2026',
    local: 'Continente',
    email: 'ana@example.com',
    total: 3.5,
    produtos: [{ produto: 'Leite', valor: 1.5 }],
  }

  it('rejeita pedido sem api key', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/compras', payload })
    expect(res.statusCode).toBe(401)
  })

  it('regista compra com api key válida', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({ id: 1, name: 'Continente' } as never)
    prismaMock.product.findFirst.mockResolvedValueOnce(null)
    prismaMock.product.create.mockResolvedValueOnce({ id: 1, name: 'Leite' } as never)
    prismaMock.priceRecord.create.mockResolvedValueOnce({ id: 1 } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload,
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ supermarketId: 1, productsCreated: 1, pricesCreated: 1 })
  })
})
