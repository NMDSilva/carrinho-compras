import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import prisma from '../../shared/lib/prisma'

const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const

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

export function getProfile(id: number) {
  return prisma.user.findUnique({ where: { id }, select: profileSelect })
}

export function updateProfile(id: number, data: Record<string, unknown>) {
  return prisma.user.update({ where: { id }, data, select: profileSelect })
}

export function comparePassword(plain: string, hashed: string) {
  return bcrypt.compare(plain, hashed)
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12)
}
