import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { prismaMock } from './mocks/prisma'
import { authHeader } from './helpers'

describe('supermarkets routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('lista supermercados publicamente', async () => {
    prismaMock.supermarket.findMany.mockResolvedValueOnce([
      { id: 1, name: 'Continente', location: null } as never,
    ])

    const res = await app.inject({ method: 'GET', url: '/api/supermarkets' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
  })

  it('devolve 404 para supermercado inexistente', async () => {
    prismaMock.supermarket.findUnique.mockResolvedValueOnce(null)

    const res = await app.inject({ method: 'GET', url: '/api/supermarkets/999' })

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

  it('elimina supermercado autenticado', async () => {
    prismaMock.supermarket.delete.mockResolvedValueOnce({} as never)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/supermarkets/1',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
    })

    expect(res.statusCode).toBe(204)
  })
})
