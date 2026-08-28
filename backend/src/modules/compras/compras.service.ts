import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import prisma from '../../shared/lib/prisma'
import { ComprasRequest } from './compras.schema'

// Utilizador placeholder para faturas cujo email não corresponde a nenhuma
// conta registada — evita atribuir a compra a um utilizador real ao acaso
// (ou rebentar se esse id não existir). Password aleatória: ninguém consegue
// entrar com esta conta, é só um "dono" válido para os registos.
const SYSTEM_USER_EMAIL = 'sistema@carrinho-compras.local'

async function getOrCreateSystemUser(): Promise<{ id: number }> {
  const existing = await prisma.user.findUnique({ where: { email: SYSTEM_USER_EMAIL } })
  if (existing) return existing

  try {
    return await prisma.user.create({
      data: {
        email: SYSTEM_USER_EMAIL,
        name: 'Sistema (importação automática)',
        password: await bcrypt.hash(randomUUID(), 12),
        role: 'USER',
      },
    })
  } catch (err) {
    // outro pedido concorrente já criou o utilizador entretanto
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const created = await prisma.user.findUnique({ where: { email: SYSTEM_USER_EMAIL } })
      if (created) return created
    }
    throw err
  }
}

export async function registarCompra(body: ComprasRequest) {
  const [day, month, year] = body.data.split('/')
  const date = new Date(`${year}-${month}-${day}T12:00:00.000Z`)

  const user = await prisma.user.findFirst({
    where: { email: { equals: body.email, mode: 'insensitive' } },
  })

  const userId = user ? user.id : (await getOrCreateSystemUser()).id

  // Uma fatura pode ter vários produtos — se um falhar a meio (ex: produto
  // duplicado, FK inválida), a transação garante que não ficam preços
  // registados sem os produtos correspondentes nem vice-versa.
  return prisma.$transaction(async (tx) => {
    let supermarket = await tx.supermarket.findFirst({
      where: { name: { equals: body.local, mode: 'insensitive' } },
    })
    if (!supermarket) {
      supermarket = await tx.supermarket.create({
        data: { name: body.local, createdById: userId },
      })
    }

    let productsCreated = 0
    let pricesCreated = 0
    const records = []

    for (const item of body.produtos) {
      // Find-or-create por texto exato (case-insensitive) do nome — se o
      // mesmo texto de fatura já apareceu antes, reutiliza o mesmo produto
      // placeholder e continua a acumular histórico de preço nele, mesmo
      // antes de qualquer revisão manual.
      let product = await tx.product.findFirst({
        where: { name: { equals: item.produto, mode: 'insensitive' } },
        include: { variants: true },
      })

      let variant: { id: number }

      if (product && product.variants.length === 1) {
        // Placeholder já existente (ou produto manual com exatamente 1
        // variante) — reutiliza sem ambiguidade.
        variant = product.variants[0]
      } else {
        // Não encontrado, ou encontrado mas já curado manualmente com 0 ou
        // 2+ variantes (sem variante inequívoca para atribuir o preço) —
        // nunca tenta adivinhar, cria sempre um novo produto placeholder.
        product = await tx.product.create({
          data: {
            name: item.produto,
            needsReview: true,
            createdById: userId,
            variants: { create: { unit: 'un', createdById: userId } },
          },
          include: { variants: true },
        })
        variant = product.variants[0]
        productsCreated++
      }

      const priceRecord = await tx.priceRecord.create({
        data: {
          productId: product.id,
          variantId: variant.id,
          supermarketId: supermarket.id,
          price: item.valor,
          quantity: 1,
          notes: `Registado através da importação da fatura ${body.fatura}`,
          date,
          createdById: userId,
        },
      })
      pricesCreated++
      records.push({
        product: product.name,
        price: item.valor,
        priceRecordId: priceRecord.id,
      })
    }

    return {
      supermarketId: supermarket.id,
      productsCreated,
      pricesCreated,
      records,
    }
  })
}
