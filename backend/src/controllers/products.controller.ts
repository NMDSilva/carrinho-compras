import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import type { AuthRequest } from '../middleware/auth.middleware'

const productSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  brand: z.string().nullable().optional(),
  unit: z.string().min(1, 'Unidade obrigatória'),
  category: z.string().nullable().optional(),
})

const userSelect = { select: { id: true, name: true } }

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
        createdBy: userSelect,
        updatedBy: userSelect,
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
        createdBy: userSelect,
        updatedBy: userSelect,
      },
    })
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' })
    res.json(product)
  } catch (error) {
    next(error)
  }
}

export async function getCategories(_req: Request, res: Response, next: NextFunction) {
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
    const userId = (req as AuthRequest).userId
    const product = await prisma.product.create({
      data: { ...data, createdById: userId, updatedById: userId },
      include: { createdBy: userSelect, updatedBy: userSelect },
    })
    res.status(201).json(product)
  } catch (error) {
    next(error)
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const data = productSchema.partial().parse(req.body)
    const userId = (req as AuthRequest).userId
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { ...data, updatedById: userId },
      include: { createdBy: userSelect, updatedBy: userSelect },
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
