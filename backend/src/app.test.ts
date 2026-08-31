import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from './app'
import { prismaMock } from '../tests/mocks/prisma'

describe('healthcheck', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('responde 200 quando a base de dados responde', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }] as never)

    const res = await app.inject({ method: 'GET', url: '/api/health' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok', database: 'ok' })
  })

  // Antes devolvia um objeto estático: uma app de pé mas sem ligação à BD
  // (ex: password errada no .env) passava o gate do deploy e ficava inútil em
  // silêncio (AUDITORIA.md, 31/08/2026).
  it('responde 503 quando a base de dados está inacessível', async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error('connection refused'))

    const res = await app.inject({ method: 'GET', url: '/api/health' })

    expect(res.statusCode).toBe(503)
    expect(res.json()).toMatchObject({ status: 'error', database: 'unreachable' })
  })

  it('continua público — é o healthcheck do deploy e da monitorização', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }] as never)

    const res = await app.inject({ method: 'GET', url: '/api/health' })

    expect(res.statusCode).not.toBe(401)
  })
})
