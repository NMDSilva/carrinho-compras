import prisma from '../../shared/lib/prisma'

const userSelect = { select: { id: true, name: true } }

export function listSupermarkets() {
  return prisma.supermarket.findMany({
    include: { _count: { select: { prices: true } }, createdBy: userSelect, updatedBy: userSelect },
    orderBy: { name: 'asc' },
    take: 500, // sem paginação na UI — só um limite de segurança
  })
}

export function getSupermarketById(id: number) {
  return prisma.supermarket.findUnique({
    where: { id },
    include: {
      prices: { include: { product: true }, orderBy: { date: 'desc' }, take: 50 },
      createdBy: userSelect,
      updatedBy: userSelect,
    },
  })
}

export function createSupermarket(data: Record<string, unknown>, userId: number) {
  return prisma.supermarket.create({
    data: { ...data, createdById: userId, updatedById: userId } as never,
    include: { createdBy: userSelect, updatedBy: userSelect },
  })
}

export function updateSupermarket(id: number, data: Record<string, unknown>, userId: number) {
  return prisma.supermarket.update({
    where: { id },
    data: { ...data, updatedById: userId },
    include: { createdBy: userSelect, updatedBy: userSelect },
  })
}

export function deleteSupermarket(id: number) {
  return prisma.supermarket.delete({ where: { id } })
}
