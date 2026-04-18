import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { getAuthUser } from '../middleware/auth.middleware'

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  password: z.string().min(6).optional(),
})

export async function listUsers(_request: FastifyRequest, reply: FastifyReply) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  return reply.send(users)
}

export async function getUser(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = Number(request.params.id)
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!user)
    return reply.status(404).send({ error: 'Utilizador não encontrado' })
  return reply.send(user)
}

export async function updateUser(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = Number(request.params.id)
  const { userId: requesterId } = getAuthUser(request)
  const data = updateUserSchema.parse(request.body)

  if (data.role && data.role !== 'ADMIN' && id === requesterId) {
    return reply
      .status(400)
      .send({ error: 'Não pode alterar o seu próprio papel de administrador' })
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing)
    return reply.status(404).send({ error: 'Utilizador não encontrado' })

  if (data.email && data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: data.email },
    })
    if (emailTaken) return reply.status(409).send({ error: 'Email já em uso' })
  }

  const updateData: Record<string, unknown> = {}
  if (data.name) updateData.name = data.name
  if (data.email) updateData.email = data.email
  if (data.role) updateData.role = data.role
  if (data.password) updateData.password = await bcrypt.hash(data.password, 12)

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return reply.send(user)
}

export async function deleteUser(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = Number(request.params.id)
  const { userId: requesterId } = getAuthUser(request)

  if (id === requesterId) {
    return reply
      .status(400)
      .send({ error: 'Não pode eliminar a sua própria conta' })
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing)
    return reply.status(404).send({ error: 'Utilizador não encontrado' })

  await prisma.user.delete({ where: { id } })
  return reply.status(204).send()
}
