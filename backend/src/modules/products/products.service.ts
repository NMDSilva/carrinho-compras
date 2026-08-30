import prisma from '../../shared/lib/prisma'

const userSelect = { select: { id: true, name: true } }
const variantInclude = {
  _count: { select: { prices: true } },
  createdBy: userSelect,
  updatedBy: userSelect,
}

export function listProducts(filters: {
  search?: string
  category?: string
  needsReview?: boolean
  limit: number
  offset: number
}) {
  const { search, category, needsReview, limit, offset } = filters
  const where = {
    AND: [
      search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {},
      category ? { category } : {},
      needsReview !== undefined ? { needsReview } : {},
    ],
  }
  return Promise.all([
    prisma.product.findMany({
      where,
      include: {
        variants: { include: variantInclude },
        createdBy: userSelect,
        updatedBy: userSelect,
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.product.count({ where }),
  ])
}

export function getProductById(id: number) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      variants: {
        include: {
          prices: {
            include: { supermarket: true },
            orderBy: { date: 'desc' },
            take: 50,
          },
          createdBy: userSelect,
          updatedBy: userSelect,
        },
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

export function updateProduct(
  id: number,
  data: Record<string, unknown>,
  userId: number
) {
  return prisma.product.update({
    where: { id },
    data: { ...data, updatedById: userId },
    include: { createdBy: userSelect, updatedBy: userSelect },
  })
}

export function deleteProduct(id: number) {
  return prisma.product.delete({ where: { id } })
}

// Marca um produto como revisto (limpa needsReview) — ação dedicada em vez de
// aceitar needsReview no update genérico, para não poder ser manipulado por
// engano/arbitrariamente a partir do formulário normal de produto.
export function markProductReviewed(id: number, userId: number) {
  return prisma.product.update({
    where: { id },
    data: { needsReview: false, updatedById: userId },
    include: { createdBy: userSelect, updatedBy: userSelect },
  })
}

// --- Variantes ---

export function listVariants(productId: number) {
  return prisma.productVariant.findMany({
    where: { productId },
    include: variantInclude,
    orderBy: { id: 'asc' },
  })
}

export function getVariantById(id: number) {
  return prisma.productVariant.findUnique({
    where: { id },
    include: {
      product: true,
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

export function createVariant(
  productId: number,
  data: Record<string, unknown>,
  userId: number
) {
  return prisma.productVariant.create({
    data: {
      ...data,
      productId,
      createdById: userId,
      updatedById: userId,
    } as never,
    include: variantInclude,
  })
}

export function updateVariant(
  id: number,
  data: Record<string, unknown>,
  userId: number
) {
  return prisma.productVariant.update({
    where: { id },
    data: { ...data, updatedById: userId },
    include: variantInclude,
  })
}

export function deleteVariant(id: number) {
  return prisma.productVariant.delete({ where: { id } })
}

// Reatribui uma variante para outro Product genérico (ferramenta de
// arrumação manual da fila de "produtos por rever"). Se o Product de origem
// ficar sem variantes depois da reatribuição, é eliminado — evita
// placeholders vazios a acumular na fila.
export function reassignVariant(
  id: number,
  newProductId: number,
  userId: number
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.productVariant.findUniqueOrThrow({ where: { id } })

    const variant = await tx.productVariant.update({
      where: { id },
      data: { productId: newProductId, updatedById: userId },
      include: variantInclude,
    })

    if (current.productId !== newProductId) {
      const remaining = await tx.productVariant.count({
        where: { productId: current.productId },
      })
      if (remaining === 0) {
        await tx.product.delete({ where: { id: current.productId } })
      }
    }

    return variant
  })
}
