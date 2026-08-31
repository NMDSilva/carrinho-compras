import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../app'
import { prismaMock } from '../../../tests/mocks/prisma'
import { getTokenVersionMock } from '../../../tests/setup'
import { authHeader } from '../../../tests/helpers'

// Revogação de sessões: o JWT continua criptograficamente válido até expirar
// (7 dias), por isso repor a password não chegava para expulsar ninguém. O
// payload leva `tv` e é comparado com a tokenVersion guardada no utilizador
// (AUDITORIA.md, 31/08/2026).
describe('revogação de sessão (tokenVersion)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  function pedidoAutenticado(headers: Record<string, string>) {
    prismaMock.supermarket.findMany.mockResolvedValueOnce([] as never)
    return app.inject({ method: 'GET', url: '/api/supermarkets', headers })
  }

  it('aceita um token cuja versão coincide com a do utilizador', async () => {
    getTokenVersionMock.mockResolvedValue(3)

    const res = await pedidoAutenticado(authHeader(app, { sub: 1, role: 'USER', tv: 3 }))

    expect(res.statusCode).toBe(200)
  })

  it('rejeita um token emitido antes de a password mudar', async () => {
    getTokenVersionMock.mockResolvedValue(4) // password mudou entretanto

    const res = await pedidoAutenticado(authHeader(app, { sub: 1, role: 'USER', tv: 3 }))

    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: 'Sessão expirada, volta a entrar' })
  })

  it('rejeita um token de um utilizador que já não existe', async () => {
    getTokenVersionMock.mockResolvedValue(null)

    const res = await pedidoAutenticado(authHeader(app, { sub: 99, role: 'USER', tv: 0 }))

    expect(res.statusCode).toBe(401)
  })

  // Sem isto, o deploy desta funcionalidade expulsava toda a gente de uma vez.
  it('aceita tokens antigos, sem `tv`, para o deploy não expulsar ninguém', async () => {
    getTokenVersionMock.mockResolvedValue(7)

    const res = await pedidoAutenticado(authHeader(app, { sub: 1, role: 'USER' }))

    expect(res.statusCode).toBe(200)
  })

  it('aplica a mesma verificação às rotas de administração', async () => {
    getTokenVersionMock.mockResolvedValue(4)

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: authHeader(app, { sub: 1, role: 'ADMIN', tv: 3 }),
    })

    expect(res.statusCode).toBe(401)
  })

  it('continua a devolver 403 (e não 401) a um não-admin com sessão válida', async () => {
    getTokenVersionMock.mockResolvedValue(3)

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: authHeader(app, { sub: 1, role: 'USER', tv: 3 }),
    })

    expect(res.statusCode).toBe(403)
  })
})
