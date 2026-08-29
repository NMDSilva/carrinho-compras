import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { buildApp } from '../../app'
import { prismaMock } from '../../../tests/mocks/prisma'
import { authHeader } from '../../../tests/helpers'

const { sendVerificationEmailMock, sendPasswordResetEmailMock } = vi.hoisted(() => ({
  sendVerificationEmailMock: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmailMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../shared/lib/email', () => ({
  sendVerificationEmail: sendVerificationEmailMock,
  sendPasswordResetEmail: sendPasswordResetEmailMock,
}))

// registerUser corre dentro de prisma.$transaction — fazemos o mock invocar o
// callback com o próprio prismaMock, para que os mocks de user.count/create
// dentro da transação funcionem como nos restantes testes.
function mockTransaction() {
  prismaMock.$transaction.mockImplementation((cb) => (cb as (tx: typeof prismaMock) => unknown)(prismaMock))
}

describe('auth routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    sendVerificationEmailMock.mockClear()
    sendPasswordResetEmailMock.mockClear()
  })

  it('regista o primeiro utilizador como ADMIN e envia email de confirmação', async () => {
    mockTransaction()
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    prismaMock.user.count.mockResolvedValueOnce(0)
    prismaMock.user.create.mockResolvedValueOnce({
      id: 1,
      name: 'Ana',
      email: 'ana@example.com',
      password: 'hashed',
      role: 'ADMIN',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Ana', email: 'ana@example.com', password: 'segredo123' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ message: expect.stringContaining('Verifica o teu email') })
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'ADMIN' }) })
    )
    expect(sendVerificationEmailMock).toHaveBeenCalledWith('ana@example.com', 'Ana', expect.any(String))
  })

  it('regista o segundo utilizador como USER', async () => {
    mockTransaction()
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    prismaMock.user.count.mockResolvedValueOnce(1)
    prismaMock.user.create.mockResolvedValueOnce({
      id: 2,
      name: 'Bruno',
      email: 'bruno@example.com',
      password: 'hashed',
      role: 'USER',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Bruno', email: 'bruno@example.com', password: 'segredo123' },
    })

    expect(res.statusCode).toBe(201)
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'USER' }) })
    )
  })

  it('repete o registo depois de um conflito de escrita e sucede', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    const conflict = new Prisma.PrismaClientKnownRequestError('write conflict', {
      code: 'P2034',
      clientVersion: '7.8.0',
    })
    prismaMock.$transaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce((cb) => (cb as (tx: typeof prismaMock) => unknown)(prismaMock))
    prismaMock.user.count.mockResolvedValueOnce(1)
    prismaMock.user.create.mockResolvedValueOnce({
      id: 2,
      name: 'Bruno',
      email: 'bruno@example.com',
      password: 'hashed',
      role: 'USER',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Bruno', email: 'bruno@example.com', password: 'segredo123' },
    })

    expect(res.statusCode).toBe(201)
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2)
  })

  it('rejeita registo com email já existente', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1 } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Ana', email: 'ana@example.com', password: 'segredo123' },
    })

    expect(res.statusCode).toBe(409)
    expect(sendVerificationEmailMock).not.toHaveBeenCalled()
  })

  it('autentica utilizador com email confirmado e credenciais válidas', async () => {
    const password = await bcrypt.hash('segredo123', 12)
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1,
      name: 'Ana',
      email: 'ana@example.com',
      password,
      role: 'USER',
      emailVerified: true,
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

  it('rejeita login se o email ainda não estiver confirmado', async () => {
    const password = await bcrypt.hash('segredo123', 12)
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1,
      name: 'Ana',
      email: 'ana@example.com',
      password,
      role: 'USER',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ana@example.com', password: 'segredo123' },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({ code: 'EMAIL_NOT_VERIFIED' })
  })

  it('rejeita login com password errada', async () => {
    const password = await bcrypt.hash('segredo123', 12)
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1,
      name: 'Ana',
      email: 'ana@example.com',
      password,
      role: 'USER',
      emailVerified: true,
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

  describe('verificação de email', () => {
    it('confirma o email com um token válido', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 1,
        email: 'ana@example.com',
        verificationTokenExpiresAt: new Date(Date.now() + 60_000),
      } as never)
      prismaMock.user.update.mockResolvedValueOnce({ id: 1, emailVerified: true } as never)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: { token: 'um-token-qualquer' },
      })

      expect(res.statusCode).toBe(200)
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ emailVerified: true }) })
      )
    })

    it('rejeita um token de confirmação inexistente', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: { token: 'não-existe' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('rejeita um token de confirmação expirado', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 1,
        email: 'ana@example.com',
        verificationTokenExpiresAt: new Date(Date.now() - 60_000),
      } as never)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: { token: 'expirado' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('reenvia o email de confirmação sem revelar se a conta existe', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/resend-verification',
        payload: { email: 'desconhecido@example.com' },
      })

      expect(res.statusCode).toBe(200)
      expect(sendVerificationEmailMock).not.toHaveBeenCalled()
    })

    it('não reenvia se a conta já estiver confirmada, mas responde na mesma com sucesso', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 1,
        email: 'ana@example.com',
        emailVerified: true,
      } as never)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/resend-verification',
        payload: { email: 'ana@example.com' },
      })

      expect(res.statusCode).toBe(200)
      expect(sendVerificationEmailMock).not.toHaveBeenCalled()
    })
  })

  describe('reposição de password', () => {
    it('pede reposição sem revelar se a conta existe', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email: 'desconhecido@example.com' },
      })

      expect(res.statusCode).toBe(200)
      expect(sendPasswordResetEmailMock).not.toHaveBeenCalled()
    })

    it('envia o email de reposição quando a conta existe', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1, name: 'Ana', email: 'ana@example.com' } as never)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email: 'ana@example.com' },
      })

      expect(res.statusCode).toBe(200)
      expect(sendPasswordResetEmailMock).toHaveBeenCalledWith('ana@example.com', 'Ana', expect.any(String))
    })

    it('repõe a password com um token válido', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 1,
        passwordResetTokenExpiresAt: new Date(Date.now() + 60_000),
      } as never)
      prismaMock.user.update.mockResolvedValueOnce({ id: 1 } as never)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: { token: 'um-token-qualquer', newPassword: 'novaSenha123' },
      })

      expect(res.statusCode).toBe(200)
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ passwordResetTokenHash: null }) })
      )
    })

    it('rejeita reposição com token inválido ou expirado', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: { token: 'inválido', newPassword: 'novaSenha123' },
      })

      expect(res.statusCode).toBe(400)
    })
  })
})

describe('rate limiting em /api/auth', () => {
  // App isolada — não pode partilhar estado de rate limit com o describe
  // acima, ou os testes de login/registo lá de cima começariam a falhar.
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('bloqueia ao fim de 5 tentativas de login por minuto', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    let last
    for (let i = 0; i < 6; i++) {
      last = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'ana@example.com', password: 'segredo123' },
      })
    }

    expect(last!.statusCode).toBe(429)
  })
})
