import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { getAuthUser } from '../../shared/middleware/auth.middleware'
import { sendVerificationEmail } from '../../shared/lib/email'
import * as authService from '../auth/auth.service'
import { updateUserSchema } from './users.schema'
import * as usersService from './users.service'

export async function listUsers(_request: FastifyRequest, reply: FastifyReply) {
  const users = await usersService.listUsers()
  return reply.send(users)
}

export async function getUser(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = Number(request.params.id)
  const user = await usersService.getUserById(id)
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

  const existing = await usersService.findUserById(id)
  if (!existing)
    return reply.status(404).send({ error: 'Utilizador não encontrado' })

  const emailChanged = Boolean(data.email && data.email !== existing.email)

  if (emailChanged) {
    const emailTaken = await usersService.findUserByEmail(data.email!)
    if (emailTaken) return reply.status(409).send({ error: 'Email já em uso' })
  }

  const updateData: Record<string, unknown> = {}
  if (data.name) updateData.name = data.name
  if (data.email) updateData.email = data.email
  if (data.role) updateData.role = data.role
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 12)
    // Um ADMIN a mudar a password de outra conta expulsa as sessões dela —
    // é meio caminho para recuperar uma conta comprometida (ver tokenVersion).
    updateData.tokenVersion = { increment: 1 }
  }
  // Mesma regra do PATCH /api/auth/me: um email trocado volta a ficar por
  // confirmar. Sem isto, um endereço nunca confirmado ficava marcado como
  // confirmado e passava a receber as faturas do n8n (compras.service.ts só
  // associa a fatura a contas com emailVerified: true).
  if (emailChanged) updateData.emailVerified = false

  const user = await usersService.updateUser(id, updateData)

  if (emailChanged) {
    const token = await authService.setVerificationToken(id)
    await sendVerificationEmail(user.email, user.name, token)
  }

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

  const existing = await usersService.findUserById(id)
  if (!existing)
    return reply.status(404).send({ error: 'Utilizador não encontrado' })

  await usersService.deleteUser(id)
  return reply.status(204).send()
}
