import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { buildApp } from '../src/app'
import { prismaMock } from './mocks/prisma'
import { authHeader } from './helpers'

describe('app', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('responde 200 em /api/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok' })
  })

  it('responde 401 ao criar produto sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: { name: 'Leite', unit: 'L' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('mapeia P2025 (registo não encontrado) para 404', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({ id: 1, createdById: 1 } as never)
    prismaMock.product.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Record to update not found.', {
        code: 'P2025',
        clientVersion: '7.8.0',
      })
    )

    const res = await app.inject({
      method: 'PUT',
      url: '/api/products/1',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
      payload: { name: 'Leite meio gordo' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('mapeia P2002 (constraint única) para 409', async () => {
    prismaMock.product.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`name`)', {
        code: 'P2002',
        clientVersion: '7.8.0',
      })
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
      payload: { name: 'Leite', unit: 'L' },
    })

    expect(res.statusCode).toBe(409)
  })

  it('mapeia P2003 (violação de FK) para 400', async () => {
    prismaMock.priceRecord.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed on the field: `productId`', {
        code: 'P2003',
        clientVersion: '7.8.0',
      })
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/prices',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
      payload: { productId: 999, supermarketId: 1, price: 1.5 },
    })

    expect(res.statusCode).toBe(400)
  })
})
