import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { parseInvoice, normalizeCategory, toTitleCase, suggestUnit } from '../lib/invoiceParser'
import { AuthRequest } from '../middleware/auth.middleware'

// pdf-parse não tem tipos — importar como CommonJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

// ── Preview ────────────────────────────────────────────────────────────────────

export async function previewInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file
    if (!file) return res.status(400).json({ error: 'Ficheiro PDF obrigatório' })

    const { text } = await pdfParse(file.buffer)
    const invoice = parseInvoice(text)

    // Tentar encontrar supermercado existente pelo nome
    const existingSupermarket = await prisma.supermarket.findFirst({
      where: { name: { contains: 'Continente' } },
      select: { id: true, name: true },
    })

    // Para cada item, sugerir nome limpo e verificar se produto já existe
    const allProducts = await prisma.product.findMany({
      select: { id: true, name: true, unit: true },
    })

    const items = invoice.items.map((item) => {
      const suggestedName = toTitleCase(item.description)
      const suggestedUnit = suggestUnit(item.description, item.quantity)
      const suggestedCategory = normalizeCategory(item.category)

      // Correspondência por nome (case-insensitive)
      // const match = allProducts.find(
      //   (p) => p.name.toLowerCase() === suggestedName.toLowerCase()
      // )
      const match = {id: null, name:null}

      return {
        description: item.description,
        category: item.category,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        ivaCode: item.ivaCode,
        suggestedName,
        suggestedUnit,
        suggestedCategory,
        existingProductId: match?.id ?? null,
        existingProductName: match?.name ?? null,
      }
    })

    res.json({
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      supermarketName: invoice.supermarketName,
      supermarketLocation: invoice.supermarketLocation,
      existingSupermarketId: existingSupermarket?.id ?? null,
      total: invoice.total,
      items,
    })
  } catch (error) {
    next(error)
  }
}

// ── Confirm ────────────────────────────────────────────────────────────────────

const confirmItemSchema = z.object({
  skip: z.boolean(),
  productId: z.number().nullable(),
  productName: z.string().min(1),
  productUnit: z.string().min(1),
  productCategory: z.string().nullable(),
  unitPrice: z.number().min(0),
  quantity: z.number().min(0),
})

const confirmSchema = z.object({
  date: z.string(),
  supermarketId: z.number().nullable(),
  supermarketName: z.string().min(1),
  supermarketLocation: z.string().default(''),
  items: z.array(confirmItemSchema),
})

export async function confirmImport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).userId
    const body = confirmSchema.parse(req.body)

    // Obter ou criar supermercado
    let supermarketId = body.supermarketId
    if (!supermarketId) {
      const sm = await prisma.supermarket.create({
        data: {
          name: body.supermarketName,
          location: body.supermarketLocation || null,
          createdById: userId,
        },
      })
      supermarketId = sm.id
    }

    const date = new Date(body.date)
    let productsCreated = 0
    let pricesCreated = 0

    for (const item of body.items) {
      if (item.skip) continue

      // Obter ou criar produto
      let productId = item.productId
      if (!productId) {
        const product = await prisma.product.create({
          data: {
            name: item.productName,
            unit: item.productUnit,
            category: item.productCategory || null,
            createdById: userId,
          },
        })
        productId = product.id
        productsCreated++
      }

      // Criar registo de preço
      await prisma.priceRecord.create({
        data: {
          productId,
          supermarketId,
          price: item.unitPrice,
          quantity: item.quantity,
          date,
          createdById: userId,
        },
      })
      pricesCreated++
    }

    res.json({ productsCreated, pricesCreated })
  } catch (error) {
    next(error)
  }
}
