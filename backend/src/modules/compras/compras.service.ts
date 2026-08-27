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

  let supermarket = await prisma.supermarket.findFirst({
    where: { name: { equals: body.local, mode: 'insensitive' } },
  })
  if (!supermarket) {
    supermarket = await prisma.supermarket.create({
      data: { name: body.local, createdById: userId },
    })
  }

  let productsCreated = 0
  let pricesCreated = 0
  const records = []

  for (const item of body.produtos) {
    let product = await prisma.product.findFirst({
      where: { name: { equals: item.produto, mode: 'insensitive' } },
    })
    if (!product) {
      product = await prisma.product.create({
        data: { name: item.produto, unit: 'un', createdById: userId },
      })
      productsCreated++
    }

    const priceRecord = await prisma.priceRecord.create({
      data: {
        productId: product.id,
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
}
