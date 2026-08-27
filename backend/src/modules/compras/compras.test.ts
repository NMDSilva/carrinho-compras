import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { buildApp } from '../../app'
import { prismaMock } from '../../../tests/mocks/prisma'

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

  it('usa o utilizador Sistema quando o email da fatura é desconhecido', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    prismaMock.user.create.mockResolvedValueOnce({ id: 99, email: 'sistema@carrinho-compras.local' } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({ id: 1, name: 'Continente' } as never)
    prismaMock.product.findFirst.mockResolvedValueOnce(null)
    prismaMock.product.create.mockResolvedValueOnce({ id: 1, name: 'Leite' } as never)
    prismaMock.priceRecord.create.mockResolvedValueOnce({ id: 1 } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload: { ...payload, email: 'desconhecido@example.com' },
    })

    expect(res.statusCode).toBe(201)
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'sistema@carrinho-compras.local' }) })
    )
  })

  it('reutiliza o utilizador Sistema já existente em vez de recriar', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 99, email: 'sistema@carrinho-compras.local' } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({ id: 1, name: 'Continente' } as never)
    prismaMock.product.findFirst.mockResolvedValueOnce(null)
    prismaMock.product.create.mockResolvedValueOnce({ id: 1, name: 'Leite' } as never)
    prismaMock.priceRecord.create.mockResolvedValueOnce({ id: 1 } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload: { ...payload, email: 'desconhecido@example.com' },
    })

    expect(res.statusCode).toBe(201)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('recupera de uma criação concorrente do utilizador Sistema', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    prismaMock.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 99,
      email: 'sistema@carrinho-compras.local',
    } as never)
    prismaMock.user.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.8.0',
      })
    )
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({ id: 1, name: 'Continente' } as never)
    prismaMock.product.findFirst.mockResolvedValueOnce(null)
    prismaMock.product.create.mockResolvedValueOnce({ id: 1, name: 'Leite' } as never)
    prismaMock.priceRecord.create.mockResolvedValueOnce({ id: 1 } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload: { ...payload, email: 'desconhecido@example.com' },
    })

    expect(res.statusCode).toBe(201)
  })
})
