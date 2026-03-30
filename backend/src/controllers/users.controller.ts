import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'

const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres').optional(),
})

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json(users)
  } catch (error) {
    next(error)
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id)
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' })
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id)
    const requesterId = (req as AuthRequest).userId

    const data = updateUserSchema.parse(req.body)

    // Impede que um admin se rebaixe a si próprio
    if (data.role && data.role !== 'ADMIN' && id === requesterId) {
      return res.status(400).json({ error: 'Não pode alterar o seu próprio papel de administrador' })
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Utilizador não encontrado' })

    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: data.email } })
      if (emailTaken) return res.status(409).json({ error: 'Email já em uso' })
    }

    const updateData: Record<string, unknown> = {}
    if (data.name) updateData.name = data.name
    if (data.email) updateData.email = data.email
    if (data.role) updateData.role = data.role
    if (data.password) updateData.password = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    })
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id)
    const requesterId = (req as AuthRequest).userId

    if (id === requesterId) {
      return res.status(400).json({ error: 'Não pode eliminar a sua própria conta' })
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Utilizador não encontrado' })

    await prisma.user.delete({ where: { id } })
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
