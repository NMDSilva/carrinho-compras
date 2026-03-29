import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'

const productSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  brand: z.string().nullable().optional(),
  unit: z.string().min(1, 'Unidade obrigatória'),
  category: z.string().nullable().optional(),
})

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, category } = req.query
    const products = await prisma.product.findMany({
      where: {
        AND: [
          search ? { name: { contains: String(search) } } : {},
          category ? { category: String(category) } : {},
        ],
      },
      include: {
        _count: { select: { prices: true } },
      },
      orderBy: { name: 'asc' },
    })
    res.json(products)
  } catch (error) {
    next(error)
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        prices: {
          include: { supermarket: true },
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    })
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' })
    res.json(product)
  } catch (error) {
    next(error)
  }
}

export async function getCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.product.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    })
    res.json(categories.map((c) => c.category).filter(Boolean))
  } catch (error) {
    next(error)
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const data = productSchema.parse(req.body)
    const product = await prisma.product.create({ data })
    res.status(201).json(product)
  } catch (error) {
    next(error)
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const data = productSchema.partial().parse(req.body)
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data,
    })
    res.json(product)
  } catch (error) {
    next(error)
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.product.delete({ where: { id: Number(req.params.id) } })
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
