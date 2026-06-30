import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { buildApp } from '../../app'
import { prismaMock } from '../../../tests/mocks/prisma'
import { authHeader } from '../../../tests/helpers'

describe('auth routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('regista um novo utilizador', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    prismaMock.user.count.mockResolvedValueOnce(0)
    prismaMock.user.create.mockResolvedValueOnce({
      id: 1,
      name: 'Ana',
      email: 'ana@example.com',
      password: 'hashed',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Ana', email: 'ana@example.com', password: 'segredo123' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().user).toMatchObject({ email: 'ana@example.com', role: 'ADMIN' })
  })

  it('rejeita registo com email já existente', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1 } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Ana', email: 'ana@example.com', password: 'segredo123' },
    })

    expect(res.statusCode).toBe(409)
  })

  it('autentica utilizador com credenciais válidas', async () => {
    const password = await bcrypt.hash('segredo123', 12)
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1,
      name: 'Ana',
      email: 'ana@example.com',
      password,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ana@example.com', password: 'segredo123' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('token')
  })

  it('rejeita login com password errada', async () => {
    const password = await bcrypt.hash('segredo123', 12)
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1,
      name: 'Ana',
      email: 'ana@example.com',
      password,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ana@example.com', password: 'errada' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('devolve os dados do utilizador autenticado em /me', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1,
      name: 'Ana',
      email: 'ana@example.com',
      role: 'USER',
      createdAt: new Date().toISOString(),
    } as never)

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: authHeader(app, { sub: 1, role: 'USER' }),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: 1, email: 'ana@example.com' })
  })

  it('rejeita /me sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(res.statusCode).toBe(401)
  })
})
