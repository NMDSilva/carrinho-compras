import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../app'
import { prismaMock } from '../../../tests/mocks/prisma'
import { authHeader } from '../../../tests/helpers'

describe('admin users routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('rejeita listagem sem ser admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
    })

    expect(res.statusCode).toBe(403)
  })

  it('lista utilizadores como admin', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: 1,
        name: 'Ana',
        email: 'ana@example.com',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never,
    ])

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: authHeader(app, { sub: 1, role: 'ADMIN' }),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
  })

  it('impede admin de eliminar a própria conta', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/admin/users/1',
      headers: authHeader(app, { sub: 1, role: 'ADMIN' }),
    })

    expect(res.statusCode).toBe(400)
  })

  it('elimina outro utilizador como admin', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 2 } as never)
    prismaMock.user.delete.mockResolvedValueOnce({} as never)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/admin/users/2',
      headers: authHeader(app, { sub: 1, role: 'ADMIN' }),
    })

    expect(res.statusCode).toBe(204)
  })
})
