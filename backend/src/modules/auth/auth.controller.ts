import { FastifyRequest, FastifyReply } from 'fastify'
import '@fastify/jwt'
import { getAuthUser } from '../../shared/middleware/auth.middleware'
import { sendVerificationEmail, sendPasswordResetEmail } from '../../shared/lib/email'
import {
  registerSchema,
  loginSchema,
  updateMeSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema'
import * as authService from './auth.service'

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const { name, email, password } = registerSchema.parse(request.body)
  const existing = await authService.findUserByEmail(email)
  if (existing) return reply.status(409).send({ error: 'Email já registado' })
  const user = await authService.registerUser({ name, email, password })
  const token = await authService.setVerificationToken(user.id)
  await sendVerificationEmail(user.email, user.name, token)
  return reply.status(201).send({ message: 'Conta criada. Verifica o teu email para poderes entrar.' })
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const { email, password } = loginSchema.parse(request.body)
  const user = await authService.findUserByEmail(email)
  if (!user) return reply.status(401).send({ error: 'Credenciais inválidas' })
  const valid = await authService.comparePassword(password, user.password)
  if (!valid) return reply.status(401).send({ error: 'Credenciais inválidas' })
  if (!user.emailVerified) {
    return reply.status(403).send({ error: 'Confirma o teu email antes de entrar.', code: 'EMAIL_NOT_VERIFIED' })
  }
  const token = request.server.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' })
  return reply.send({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
}

export async function verifyEmail(request: FastifyRequest, reply: FastifyReply) {
  const { token } = verifyEmailSchema.parse(request.body)
  const user = await authService.verifyEmailToken(token)
  if (!user) return reply.status(400).send({ error: 'Link inválido ou expirado' })
  return reply.send({ message: 'Email confirmado. Já podes entrar.' })
}

export async function resendVerification(request: FastifyRequest, reply: FastifyReply) {
  const { email } = resendVerificationSchema.parse(request.body)
  const user = await authService.findUserByEmail(email)
  if (user && !user.emailVerified) {
    const token = await authService.setVerificationToken(user.id)
    await sendVerificationEmail(user.email, user.name, token)
  }
  // Resposta genérica sempre — não revela se a conta existe ou já está confirmada.
  return reply.send({ message: 'Se a conta existir e ainda não estiver confirmada, enviámos um novo email.' })
}

export async function forgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const { email } = forgotPasswordSchema.parse(request.body)
  const user = await authService.findUserByEmail(email)
  if (user) {
    const token = await authService.setPasswordResetToken(user.id)
    await sendPasswordResetEmail(user.email, user.name, token)
  }
  // Resposta genérica sempre — evita confirmar se um email tem conta registada.
  return reply.send({ message: 'Se a conta existir, enviámos um email com um link para repor a password.' })
}

export async function resetPassword(request: FastifyRequest, reply: FastifyReply) {
  const { token, newPassword } = resetPasswordSchema.parse(request.body)
  const user = await authService.resetPasswordWithToken(token, newPassword)
  if (!user) return reply.status(400).send({ error: 'Link inválido ou expirado' })
  return reply.send({ message: 'Password atualizada. Já podes entrar.' })
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
