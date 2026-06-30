import prisma from '../../shared/lib/prisma'

const userSelect = { select: { id: true, name: true } }

export function listProducts(filters: { search?: string; category?: string }) {
  const { search, category } = filters
  return prisma.product.findMany({
    where: {
      AND: [
        search ? { name: { contains: search, mode: 'insensitive' } } : {},
        category ? { category } : {},
      ],
    },
    include: {
      _count: { select: { prices: true } },
      createdBy: userSelect,
      updatedBy: userSelect,
    },
    orderBy: { name: 'asc' },
  })
}

export function getProductById(id: number) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      prices: {
        include: { supermarket: true },
        orderBy: { date: 'desc' },
        take: 50,
      },
      createdBy: userSelect,
      updatedBy: userSelect,
    },
  })
}

export function listCategories() {
  return prisma.product.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  })
}

export function createProduct(data: Record<string, unknown>, userId: number) {
  return prisma.product.create({
    data: { ...data, createdById: userId, updatedById: userId } as never,
    include: { createdBy: userSelect, updatedBy: userSelect },
  })
}

export function updateProduct(id: number, data: Record<string, unknown>, userId: number) {
  return prisma.product.update({
    where: { id },
    data: { ...data, updatedById: userId },
    include: { createdBy: userSelect, updatedBy: userSelect },
  })
}

export function deleteProduct(id: number) {
  return prisma.product.delete({ where: { id } })
}
