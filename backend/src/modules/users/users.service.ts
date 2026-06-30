import prisma from '../../shared/lib/prisma'

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

export function listUsers() {
  return prisma.user.findMany({ select: userSelect, orderBy: { createdAt: 'asc' } })
}

export function findUserById(id: number) {
  return prisma.user.findUnique({ where: { id } })
}

export function getUserById(id: number) {
  return prisma.user.findUnique({ where: { id }, select: userSelect })
}

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export function updateUser(id: number, data: Record<string, unknown>) {
  return prisma.user.update({ where: { id }, data, select: userSelect })
}

export function deleteUser(id: number) {
  return prisma.user.delete({ where: { id } })
}
