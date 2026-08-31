import { randomBytes, createHash } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import prisma from '../../shared/lib/prisma'

const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  theme: true,
  createdAt: true,
} as const

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1h

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export function findUserById(id: number) {
  return prisma.user.findUnique({ where: { id } })
}

// Regista um utilizador novo, atribuindo ADMIN só se for mesmo o primeiro.
// A contagem + criação corre numa transação SERIALIZABLE para evitar que dois
// registos em simultâneo, ambos a ver a BD vazia, se tornem os dois ADMIN.
// O Postgres aborta uma das transações com um conflito de escrita (P2034);
// nesse caso repetimos — a segunda tentativa já vê o outro utilizador criado.
const MAX_REGISTER_ATTEMPTS = 3

export async function registerUser(input: { name: string; email: string; password: string }) {
  const hashed = await bcrypt.hash(input.password, 12)

  for (let attempt = 1; attempt <= MAX_REGISTER_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const count = await tx.user.count()
          const role = count === 0 ? 'ADMIN' : 'USER'
          return tx.user.create({
            data: { name: input.name, email: input.email, password: hashed, role },
          })
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    } catch (err) {
      const isWriteConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034'
      if (!isWriteConflict || attempt === MAX_REGISTER_ATTEMPTS) throw err
    }
  }

  throw new Error('unreachable')
}

// profileResponseSchema exige createdAt como string — o Prisma devolve
// sempre um Date real para DateTime, nunca serializa sozinho.
function serializeProfile<T extends { createdAt: Date }>(user: T) {
  return { ...user, createdAt: user.createdAt.toISOString() }
}

export async function getProfile(id: number) {
  const user = await prisma.user.findUnique({ where: { id }, select: profileSelect })
  return user ? serializeProfile(user) : null
}

export async function updateProfile(id: number, data: Record<string, unknown>) {
  const user = await prisma.user.update({ where: { id }, data, select: profileSelect })
  return serializeProfile(user)
}

export function comparePassword(plain: string, hashed: string) {
  return bcrypt.compare(plain, hashed)
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12)
}

// --- Verificação de email / reposição de password ---
//
// Nunca se guarda o token em texto simples — só o hash SHA-256. O valor
// enviado por email é o token cru; para o validar, faz-se hash do que chega
// e compara-se com o hash guardado. Mesmo com acesso direto à BD (ex: um
// dump), não dá para usar um link de verificação/reposição ainda válido.

function generateRawToken() {
  return randomBytes(32).toString('hex')
}

function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}

export async function setVerificationToken(userId: number): Promise<string> {
  const raw = generateRawToken()
  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationTokenHash: hashToken(raw),
      verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  })
  return raw
}

// Devolve o utilizador confirmado, ou null se o token for inválido/expirado.
export async function verifyEmailToken(rawToken: string) {
  const user = await prisma.user.findUnique({ where: { verificationTokenHash: hashToken(rawToken) } })
  if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) return null

  return prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationTokenHash: null, verificationTokenExpiresAt: null },
  })
}

export async function setPasswordResetToken(userId: number): Promise<string> {
  const raw = generateRawToken()
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetTokenHash: hashToken(raw),
      passwordResetTokenExpiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  })
  return raw
}

// Devolve o utilizador com a password já atualizada, ou null se o token for
// inválido/expirado.
export async function resetPasswordWithToken(rawToken: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { passwordResetTokenHash: hashToken(rawToken) } })
  if (!user || !user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt < new Date()) return null

  return prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(newPassword),
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
    },
  })
}
