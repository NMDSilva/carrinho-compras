import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'

const supermarketSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  location: z.string().nullable().optional(),
})

export async function getSupermarkets(req: Request, res: Response, next: NextFunction) {
  try {
    const supermarkets = await prisma.supermarket.findMany({
      include: { _count: { select: { prices: true } } },
      orderBy: { name: 'asc' },
    })
    res.json(supermarkets)
  } catch (error) {
    next(error)
  }
}

export async function getSupermarket(req: Request, res: Response, next: NextFunction) {
  try {
    const supermarket = await prisma.supermarket.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        prices: {
          include: { product: true },
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    })
    if (!supermarket) return res.status(404).json({ error: 'Supermercado não encontrado' })
    res.json(supermarket)
  } catch (error) {
    next(error)
  }
}

export async function createSupermarket(req: Request, res: Response, next: NextFunction) {
  try {
    const data = supermarketSchema.parse(req.body)
    const supermarket = await prisma.supermarket.create({ data })
    res.status(201).json(supermarket)
  } catch (error) {
    next(error)
  }
}

export async function updateSupermarket(req: Request, res: Response, next: NextFunction) {
  try {
    const data = supermarketSchema.partial().parse(req.body)
    const supermarket = await prisma.supermarket.update({
      where: { id: Number(req.params.id) },
      data,
    })
    res.json(supermarket)
  } catch (error) {
    next(error)
  }
}

export async function deleteSupermarket(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.supermarket.delete({ where: { id: Number(req.params.id) } })
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
