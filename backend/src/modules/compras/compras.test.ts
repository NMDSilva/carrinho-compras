import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { buildApp } from '../../app'
import { prismaMock } from '../../../tests/mocks/prisma'

// O processamento da fatura corre dentro de prisma.$transaction — o mock
// invoca o callback com o próprio prismaMock, para os mocks por-model
// (supermarket/product/priceRecord) funcionarem como esperado.
function mockTransaction() {
  prismaMock.$transaction.mockImplementation((cb) => (cb as (tx: typeof prismaMock) => unknown)(prismaMock))
}

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
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({ id: 1, name: 'Continente' } as never)
    prismaMock.product.findFirst.mockResolvedValueOnce(null)
    prismaMock.product.create.mockResolvedValueOnce({ id: 1, name: 'Leite', variants: [{ id: 1 }] } as never)
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

  it('só associa a fatura a um utilizador com email confirmado (evita sequestro por troca de email)', async () => {
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({ id: 1, name: 'Continente' } as never)
    prismaMock.product.findFirst.mockResolvedValueOnce(null)
    prismaMock.product.create.mockResolvedValueOnce({ id: 1, name: 'Leite', variants: [{ id: 1 }] } as never)
    prismaMock.priceRecord.create.mockResolvedValueOnce({ id: 1 } as never)

    await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload,
    })

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ emailVerified: true }) })
    )
  })

  it('usa o utilizador Sistema quando o email da fatura é desconhecido', async () => {
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    prismaMock.user.create.mockResolvedValueOnce({ id: 99, email: 'sistema@carrinho-compras.local' } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({ id: 1, name: 'Continente' } as never)
    prismaMock.product.findFirst.mockResolvedValueOnce(null)
    prismaMock.product.create.mockResolvedValueOnce({ id: 1, name: 'Leite', variants: [{ id: 1 }] } as never)
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
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 99, email: 'sistema@carrinho-compras.local' } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({ id: 1, name: 'Continente' } as never)
    prismaMock.product.findFirst.mockResolvedValueOnce(null)
    prismaMock.product.create.mockResolvedValueOnce({ id: 1, name: 'Leite', variants: [{ id: 1 }] } as never)
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
    mockTransaction()
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
    prismaMock.product.create.mockResolvedValueOnce({ id: 1, name: 'Leite', variants: [{ id: 1 }] } as never)
    prismaMock.priceRecord.create.mockResolvedValueOnce({ id: 1 } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload: { ...payload, email: 'desconhecido@example.com' },
    })

    expect(res.statusCode).toBe(201)
  })

  it('reutiliza a variante quando o produto encontrado já tem exatamente uma', async () => {
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({ id: 1, name: 'Continente' } as never)
    prismaMock.product.findFirst.mockResolvedValueOnce({
      id: 7,
      name: 'Leite',
      variants: [{ id: 42 }],
    } as never)
    prismaMock.priceRecord.create.mockResolvedValueOnce({ id: 1 } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload,
    })

    expect(res.statusCode).toBe(201)
    expect(prismaMock.product.create).not.toHaveBeenCalled()
    expect(prismaMock.priceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ variantId: 42 }) })
    )
  })

  it('cria um novo placeholder quando o produto encontrado já tem 2+ variantes (nunca adivinha qual)', async () => {
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({ id: 1, name: 'Continente' } as never)
    prismaMock.product.findFirst.mockResolvedValueOnce({
      id: 7,
      name: 'Açúcar branco',
      variants: [{ id: 1 }, { id: 2 }],
    } as never)
    prismaMock.product.create.mockResolvedValueOnce({
      id: 8,
      name: 'Leite',
      needsReview: true,
      variants: [{ id: 99 }],
    } as never)
    prismaMock.priceRecord.create.mockResolvedValueOnce({ id: 1 } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload,
    })

    expect(res.statusCode).toBe(201)
    expect(prismaMock.product.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ needsReview: true }) })
    )
    expect(prismaMock.priceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ variantId: 99 }) })
    )
  })

  it('propaga o erro (sem responder 201) se um produto a meio da fatura falhar', async () => {
    mockTransaction()
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 1 } as never)
    prismaMock.supermarket.findFirst.mockResolvedValueOnce({ id: 1, name: 'Continente' } as never)
    prismaMock.product.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    prismaMock.product.create
      .mockResolvedValueOnce({ id: 1, name: 'Leite', variants: [{ id: 1 }] } as never)
      .mockResolvedValueOnce({ id: 2, name: 'Pão', variants: [{ id: 2 }] } as never)
    prismaMock.priceRecord.create
      .mockResolvedValueOnce({ id: 1 } as never)
      .mockRejectedValueOnce(new Error('falha a meio da fatura'))

    const res = await app.inject({
      method: 'POST',
      url: '/api/compras',
      headers: { 'x-api-key': 'test-api-key' },
      payload: {
        ...payload,
        produtos: [
          { produto: 'Leite', valor: 1.5 },
          { produto: 'Pão', valor: 2 },
        ],
      },
    })

    expect(res.statusCode).toBe(500)
  })
})
