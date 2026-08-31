import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../app'
import { prismaMock } from '../../../tests/mocks/prisma'
import { authHeader } from '../../../tests/helpers'

describe('supermarkets routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('lista supermercados', async () => {
    prismaMock.supermarket.findMany.mockResolvedValueOnce([
      { id: 1, name: 'Continente', location: null } as never,
    ])

    const res = await app.inject({ method: 'GET', url: '/api/supermarkets', headers: authHeader(app, { sub: 1, role: 'USER' }) })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
  })

  it('devolve 404 para supermercado inexistente', async () => {
    prismaMock.supermarket.findUnique.mockResolvedValueOnce(null)

    const res = await app.inject({ method: 'GET', url: '/api/supermarkets/999', headers: authHeader(app, { sub: 1, role: 'USER' }) })

    expect(res.statusCode).toBe(404)
  })

  it('cria supermercado autenticado', async () => {
    prismaMock.supermarket.create.mockResolvedValueOnce({
      id: 1,
      name: 'Continente',
      location: null,
    } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/supermarkets',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
      payload: { name: 'Continente' },
    })

    expect(res.statusCode).toBe(201)
  })

  it('rejeita criação sem autenticação', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/supermarkets',
      payload: { name: 'Continente' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('elimina supermercado próprio', async () => {
    prismaMock.supermarket.findUnique.mockResolvedValueOnce({ id: 1, createdById: 1 } as never)
    prismaMock.supermarket.delete.mockResolvedValueOnce({} as never)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/supermarkets/1',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
    })

    expect(res.statusCode).toBe(204)
  })

  it('rejeita eliminação de supermercado de outro utilizador', async () => {
    prismaMock.supermarket.findUnique.mockResolvedValueOnce({ id: 1, createdById: 2 } as never)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/supermarkets/1',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
    })

    expect(res.statusCode).toBe(403)
  })

  it('admin elimina supermercado de outro utilizador', async () => {
    prismaMock.supermarket.findUnique.mockResolvedValueOnce({ id: 1, createdById: 2 } as never)
    prismaMock.supermarket.delete.mockResolvedValueOnce({} as never)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/supermarkets/1',
      headers: authHeader(app, { sub: 99, role: 'ADMIN' }),
    })

    expect(res.statusCode).toBe(204)
  })

  // As leituras eram públicas até 31/08/2026 — expunham o dataset todo e os
  // nomes reais em createdBy a quem não estivesse autenticado (AUDITORIA.md).
  describe.each([
    '/api/supermarkets',
    '/api/supermarkets/1',
  ])(`leitura protegida: %s`, (url) => {
    it(`responde 401 sem token`, async () => {
      const res = await app.inject({ method: 'GET', url })
      expect(res.statusCode).toBe(401)
    })
  })
})
