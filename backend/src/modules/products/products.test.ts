import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../app'
import { prismaMock } from '../../../tests/mocks/prisma'
import { authHeader } from '../../../tests/helpers'

describe('products routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('lista produtos publicamente', async () => {
    prismaMock.product.findMany.mockResolvedValueOnce([
      { id: 1, name: 'Leite', unit: 'L', brand: null, category: null } as never,
    ])

    const res = await app.inject({ method: 'GET', url: '/api/products' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
  })

  it('devolve 404 para produto inexistente', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce(null)

    const res = await app.inject({ method: 'GET', url: '/api/products/999' })

    expect(res.statusCode).toBe(404)
  })

  it('cria produto autenticado', async () => {
    prismaMock.product.create.mockResolvedValueOnce({
      id: 1,
      name: 'Leite',
      unit: 'L',
      brand: null,
      category: null,
    } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
      payload: { name: 'Leite', unit: 'L' },
    })

    expect(res.statusCode).toBe(201)
  })

  it('rejeita criação sem autenticação', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: { name: 'Leite', unit: 'L' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('valida payload inválido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
      payload: { name: '' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('elimina produto autenticado', async () => {
    prismaMock.product.delete.mockResolvedValueOnce({} as never)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/products/1',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
    })

    expect(res.statusCode).toBe(204)
  })
})
