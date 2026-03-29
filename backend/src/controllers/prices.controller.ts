import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import type { AuthRequest } from '../middleware/auth.middleware'

const priceRecordSchema = z.object({
  productId: z.number().int().positive(),
  supermarketId: z.number().int().positive(),
  price: z.number().positive('Preço deve ser positivo'),
  quantity: z.number().positive().default(1),
  date: z.string().datetime().optional(),
  notes: z.string().nullable().optional(),
})

const userSelect = { select: { id: true, name: true } }

export async function getPrices(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId, supermarketId, limit = '20', offset = '0' } = req.query
    const prices = await prisma.priceRecord.findMany({
      where: {
        ...(productId ? { productId: Number(productId) } : {}),
        ...(supermarketId ? { supermarketId: Number(supermarketId) } : {}),
      },
      include: {
        product: true,
        supermarket: true,
        createdBy: userSelect,
        updatedBy: userSelect,
      },
      orderBy: { date: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    })
    const total = await prisma.priceRecord.count({
      where: {
        ...(productId ? { productId: Number(productId) } : {}),
        ...(supermarketId ? { supermarketId: Number(supermarketId) } : {}),
      },
    })
    res.json({ data: prices, total })
  } catch (error) {
    next(error)
  }
}

export async function createPrice(req: Request, res: Response, next: NextFunction) {
  try {
    const data = priceRecordSchema.parse(req.body)
    const userId = (req as AuthRequest).userId
    const price = await prisma.priceRecord.create({
      data: {
        ...data,
        date: data.date ? new Date(data.date) : new Date(),
        createdById: userId,
        updatedById: userId,
      },
      include: { product: true, supermarket: true, createdBy: userSelect, updatedBy: userSelect },
    })
    res.status(201).json(price)
  } catch (error) {
    next(error)
  }
}

export async function updatePrice(req: Request, res: Response, next: NextFunction) {
  try {
    const data = priceRecordSchema.partial().parse(req.body)
    const userId = (req as AuthRequest).userId
    const price = await prisma.priceRecord.update({
      where: { id: Number(req.params.id) },
      data: {
        ...data,
        ...(data.date ? { date: new Date(data.date) } : {}),
        updatedById: userId,
      },
      include: { product: true, supermarket: true, createdBy: userSelect, updatedBy: userSelect },
    })
    res.json(price)
  } catch (error) {
    next(error)
  }
}

export async function deletePrice(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.priceRecord.delete({ where: { id: Number(req.params.id) } })
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

// Comparar preços de um produto entre supermercados (último registo por supermercado)
export async function compareProductPrices(req: Request, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.productId)

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' })

    const allPrices = await prisma.priceRecord.findMany({
      where: { productId },
      include: { supermarket: true, createdBy: userSelect },
      orderBy: { date: 'desc' },
    })

    const bySuper = new Map<number, (typeof allPrices)[0]>()
    for (const p of allPrices) {
      if (!bySuper.has(p.supermarketId)) {
        bySuper.set(p.supermarketId, p)
      }
    }

    const result = Array.from(bySuper.values()).sort((a, b) => a.price - b.price)
    res.json({ product, prices: result })
  } catch (error) {
    next(error)
  }
}

// Histórico de preços de um produto num ou mais supermercados
export async function getPriceHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.productId)
    const { supermarketIds } = req.query

    const supermarketFilter = supermarketIds
      ? String(supermarketIds).split(',').map(Number).filter((n) => !isNaN(n))
      : undefined

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' })

    const history = await prisma.priceRecord.findMany({
      where: {
        productId,
        ...(supermarketFilter ? { supermarketId: { in: supermarketFilter } } : {}),
      },
      include: { supermarket: true },
      orderBy: { date: 'asc' },
    })

    const grouped: Record<string, { supermarket: { id: number; name: string }; records: { date: string; price: number }[] }> = {}
    for (const record of history) {
      const key = String(record.supermarketId)
      if (!grouped[key]) {
        grouped[key] = {
          supermarket: { id: record.supermarket.id, name: record.supermarket.name },
          records: [],
        }
      }
      grouped[key].records.push({ date: record.date.toISOString(), price: record.price })
    }

    res.json({ product, history: Object.values(grouped) })
  } catch (error) {
    next(error)
  }
}

// Stats para o dashboard
export async function getDashboardStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const [totalProducts, totalSupermarkets, totalPrices, recentPrices] = await Promise.all([
      prisma.product.count(),
      prisma.supermarket.count(),
      prisma.priceRecord.count(),
      prisma.priceRecord.findMany({
        include: { product: true, supermarket: true, createdBy: userSelect },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    const cheapestByProduct = await prisma.$queryRaw<
      { productId: number; productName: string; minPrice: number; supermarketName: string; date: string }[]
    >`
      SELECT
        p.id as productId,
        p.name as productName,
        pr.price as minPrice,
        s.name as supermarketName,
        pr.date as date
      FROM PriceRecord pr
      JOIN Product p ON p.id = pr.productId
      JOIN Supermarket s ON s.id = pr.supermarketId
      WHERE pr.id IN (
        SELECT id FROM PriceRecord pr2
        WHERE pr2.productId = pr.productId
        ORDER BY pr2.price ASC
        LIMIT 1
      )
      ORDER BY p.name ASC
      LIMIT 10
    `

    res.json({
      stats: { totalProducts, totalSupermarkets, totalPrices },
      recentPrices,
      cheapestByProduct,
    })
  } catch (error) {
    next(error)
  }
}
