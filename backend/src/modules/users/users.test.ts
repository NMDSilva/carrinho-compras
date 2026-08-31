import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../app'
import { prismaMock } from '../../../tests/mocks/prisma'
import { authHeader } from '../../../tests/helpers'

const { sendVerificationEmailMock } = vi.hoisted(() => ({
  sendVerificationEmailMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../shared/lib/email', () => ({
  sendVerificationEmail: sendVerificationEmailMock,
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))

describe('admin users routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    sendVerificationEmailMock.mockClear()
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

  describe('atualização de utilizador (PATCH /users/:id)', () => {
    // Mesmo vetor corrigido em PATCH /api/auth/me: um email trocado que ficasse
    // marcado como confirmado passaria a receber as faturas do n8n desse
    // endereço (AUDITORIA.md 31/08/2026).
    it('repõe emailVerified e envia a verificação quando o admin muda o email', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 2, email: 'antigo@example.com', name: 'Rui' } as never)
        .mockResolvedValueOnce(null) // novo email ainda livre
      prismaMock.user.update.mockResolvedValueOnce({
        id: 2,
        name: 'Rui',
        email: 'novo@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/2',
        headers: authHeader(app, { sub: 1, role: 'ADMIN' }),
        payload: { email: 'novo@example.com' },
      })

      expect(res.statusCode).toBe(200)
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'novo@example.com', emailVerified: false }),
        })
      )
      expect(sendVerificationEmailMock).toHaveBeenCalledWith('novo@example.com', 'Rui', expect.any(String))
    })

    it('não mexe em emailVerified nem envia email quando só muda o nome', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 2,
        email: 'rui@example.com',
        name: 'Rui',
      } as never)
      prismaMock.user.update.mockResolvedValueOnce({
        id: 2,
        name: 'Rui Novo',
        email: 'rui@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/2',
        headers: authHeader(app, { sub: 1, role: 'ADMIN' }),
        payload: { name: 'Rui Novo' },
      })

      expect(res.statusCode).toBe(200)
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.not.objectContaining({ emailVerified: expect.anything() }) })
      )
      expect(sendVerificationEmailMock).not.toHaveBeenCalled()
    })

    it('expulsa as sessões da conta quando o admin lhe muda a password', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 2,
        email: 'rui@example.com',
        name: 'Rui',
      } as never)
      prismaMock.user.update.mockResolvedValueOnce({
        id: 2,
        name: 'Rui',
        email: 'rui@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/2',
        headers: authHeader(app, { sub: 1, role: 'ADMIN' }),
        payload: { password: 'novaSenha123' },
      })

      expect(res.statusCode).toBe(200)
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
        })
      )
    })

    it('rejeita mudança para um email já em uso, sem enviar verificação', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ id: 2, email: 'rui@example.com', name: 'Rui' } as never)
        .mockResolvedValueOnce({ id: 3, email: 'ocupado@example.com' } as never)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/2',
        headers: authHeader(app, { sub: 1, role: 'ADMIN' }),
        payload: { email: 'ocupado@example.com' },
      })

      expect(res.statusCode).toBe(409)
      expect(prismaMock.user.update).not.toHaveBeenCalled()
      expect(sendVerificationEmailMock).not.toHaveBeenCalled()
    })
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
