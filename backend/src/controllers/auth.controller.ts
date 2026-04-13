import { FastifyRequest, FastifyReply } from 'fastify'
import '@fastify/jwt'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { getAuthUser } from '../middleware/auth.middleware'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
}).refine(
  (d) => !d.newPassword || !!d.currentPassword,
  { message: 'Password atual é obrigatória para definir uma nova', path: ['currentPassword'] }
)

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const { name, email, password } = registerSchema.parse(request.body)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return reply.status(409).send({ error: 'Email já registado' })
  const count = await prisma.user.count()
  const role = count === 0 ? 'ADMIN' : 'USER'
  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({ data: { name, email, password: hashed, role } })
  const token = request.server.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' })
  return reply.status(201).send({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const { email, password } = loginSchema.parse(request.body)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return reply.status(401).send({ error: 'Credenciais inválidas' })
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return reply.status(401).send({ error: 'Credenciais inválidas' })
  const token = request.server.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' })
  return reply.send({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = getAuthUser(request)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  if (!user) return reply.status(404).send({ error: 'Utilizador não encontrado' })
  return reply.send(user)
}

export async function updateMe(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = getAuthUser(request)
  const data = updateMeSchema.parse(request.body)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return reply.status(404).send({ error: 'Utilizador não encontrado' })
  if (data.email && data.email !== user.email) {
    const taken = await prisma.user.findUnique({ where: { email: data.email } })
    if (taken) return reply.status(409).send({ error: 'Email já em uso' })
  }
  const updateData: Record<string, unknown> = {}
  if (data.name) updateData.name = data.name
  if (data.email) updateData.email = data.email
  if (data.newPassword) {
    const valid = await bcrypt.compare(data.currentPassword!, user.password)
    if (!valid) return reply.status(400).send({ error: 'Password atual incorreta' })
    updateData.password = await bcrypt.hash(data.newPassword, 12)
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  return reply.send(updated)
}
