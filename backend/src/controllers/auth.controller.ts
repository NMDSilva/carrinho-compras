import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres'),
})

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password obrigatória'),
})

function signToken(userId: number, role: string): string {
  return jwt.sign(
    { sub: userId, role },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions
  )
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = registerSchema.parse(req.body)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email já registado' })

    // O primeiro utilizador a registar-se é automaticamente ADMIN
    const count = await prisma.user.count()
    const role = count === 0 ? 'ADMIN' : 'USER'

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { name, email, password: hashed, role } })

    const token = signToken(user.id, user.role)
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (error) {
    next(error)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' })

    const token = signToken(user.id, user.role)
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (error) {
    next(error)
  }
}

const updateMeSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Password deve ter pelo menos 6 caracteres').optional(),
}).refine(
  (d) => !d.newPassword || !!d.currentPassword,
  { message: 'Password atual é obrigatória para definir uma nova', path: ['currentPassword'] }
)

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as Request & { userId: number }).userId
    const data = updateMeSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' })

    if (data.email && data.email !== user.email) {
      const taken = await prisma.user.findUnique({ where: { email: data.email } })
      if (taken) return res.status(409).json({ error: 'Email já em uso' })
    }

    const updateData: Record<string, unknown> = {}
    if (data.name) updateData.name = data.name
    if (data.email) updateData.email = data.email

    if (data.newPassword) {
      const valid = await bcrypt.compare(data.currentPassword!, user.password)
      if (!valid) return res.status(400).json({ error: 'Password atual incorreta' })
      updateData.password = await bcrypt.hash(data.newPassword, 12)
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    res.json(updated)
  } catch (error) {
    next(error)
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as Request & { userId: number }).userId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' })
    res.json(user)
  } catch (error) {
    next(error)
  }
}
