import { FastifyRequest, FastifyReply } from 'fastify'
import '@fastify/jwt'
import { getAuthUser } from '../../shared/middleware/auth.middleware'
import { registerSchema, loginSchema, updateMeSchema } from './auth.schema'
import * as authService from './auth.service'

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const { name, email, password } = registerSchema.parse(request.body)
  const existing = await authService.findUserByEmail(email)
  if (existing) return reply.status(409).send({ error: 'Email já registado' })
  const user = await authService.registerUser({ name, email, password })
  const token = request.server.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' })
  return reply.status(201).send({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const { email, password } = loginSchema.parse(request.body)
  const user = await authService.findUserByEmail(email)
  if (!user) return reply.status(401).send({ error: 'Credenciais inválidas' })
  const valid = await authService.comparePassword(password, user.password)
  if (!valid) return reply.status(401).send({ error: 'Credenciais inválidas' })
  const token = request.server.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' })
  return reply.send({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = getAuthUser(request)
  const user = await authService.getProfile(userId)
  if (!user) return reply.status(404).send({ error: 'Utilizador não encontrado' })
  return reply.send(user)
}

export async function updateMe(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = getAuthUser(request)
  const data = updateMeSchema.parse(request.body)
  const user = await authService.findUserById(userId)
  if (!user) return reply.status(404).send({ error: 'Utilizador não encontrado' })
  if (data.email && data.email !== user.email) {
    const taken = await authService.findUserByEmail(data.email)
    if (taken) return reply.status(409).send({ error: 'Email já em uso' })
  }
  const updateData: Record<string, unknown> = {}
  if (data.name) updateData.name = data.name
  if (data.email) updateData.email = data.email
  if (data.newPassword) {
    const valid = await authService.comparePassword(data.currentPassword!, user.password)
    if (!valid) return reply.status(400).send({ error: 'Password atual incorreta' })
    updateData.password = await authService.hashPassword(data.newPassword)
  }
  const updated = await authService.updateProfile(userId, updateData)
  return reply.send(updated)
}
