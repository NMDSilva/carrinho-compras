import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
const comprasSchema = z.object({
  data: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Formato de data esperado: DD/MM/YYYY'),
  local: z.string().min(1),
  total: z.number(),
  items: z.array(
    z.object({
      produto: z.string().min(1),
      valor: z.number().min(0),
      desconto: z.number().min(0).default(0),
    })
  ).min(1),
})

export async function registarCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const body = comprasSchema.parse(req.body)

    // Converter data DD/MM/YYYY → Date
    const [day, month, year] = body.data.split('/')
    const date = new Date(`${year}-${month}-${day}T12:00:00.000Z`)

    // Encontrar ou criar supermercado (correspondência exacta pelo nome)
    let supermarket = await prisma.supermarket.findFirst({
      where: { name: { equals: body.local } },
    })
    if (!supermarket) {
      supermarket = await prisma.supermarket.create({
        data: { name: body.local, createdById: null },
      })
    }

    let productsCreated = 0
    let pricesCreated = 0
    const records = []

    for (const item of body.items) {
      const netPrice = Math.round((item.valor - item.desconto) * 100) / 100

      // Encontrar ou criar produto (correspondência case-insensitive pelo nome)
      let product = await prisma.product.findFirst({
        where: { name: { equals: item.produto } },
      })
      if (!product) {
        product = await prisma.product.create({
          data: {
            name: item.produto,
            unit: 'un',
            createdById: null,
          },
        })
        productsCreated++
      }

      const priceRecord = await prisma.priceRecord.create({
        data: {
          productId: product.id,
          supermarketId: supermarket.id,
          price: netPrice,
          quantity: 1,
          date,
          notes: item.desconto > 0 ? `Desconto: ${item.desconto.toFixed(2)}€` : null,
          createdById: null,
        },
      })
      pricesCreated++
      records.push({ product: product.name, price: netPrice, priceRecordId: priceRecord.id })
    }

    res.status(201).json({
      supermarketId: supermarket.id,
      productsCreated,
      pricesCreated,
      records,
    })
  } catch (error) {
    next(error)
  }
}
