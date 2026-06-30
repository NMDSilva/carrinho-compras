import bcrypt from 'bcryptjs'
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

export function countUsers() {
  return prisma.user.count()
}

export async function createUser(input: { name: string; email: string; password: string; role: string }) {
  const hashed = await bcrypt.hash(input.password, 12)
  return prisma.user.create({
    data: { name: input.name, email: input.email, password: hashed, role: input.role },
  })
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
