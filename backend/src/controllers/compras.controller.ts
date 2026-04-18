import { FastifyRequest, FastifyReply } from 'fastify'
import prisma from '../lib/prisma'

import { comprasSchemaRequest } from '../schemas/compras.schema'

export async function registarCompra(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = comprasSchemaRequest.parse(request.body)

  const [day, month, year] = body.data.split('/')
  const date = new Date(`${year}-${month}-${day}T12:00:00.000Z`)

  const user = await prisma.user.findFirst({
    where: { email: body.email },
  })

  const userId = !user ? 1 : user.id

  let supermarket = await prisma.supermarket.findFirst({
    where: { name: { equals: body.local } },
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

  return reply.status(201).send({
    supermarketId: supermarket.id,
    productsCreated,
    pricesCreated,
    records,
  })
}
