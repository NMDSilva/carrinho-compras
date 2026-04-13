import { FastifyRequest, FastifyReply } from 'fastify'

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Autenticação necessária' })
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const user = request.user as { role: string }
    if (user.role !== 'ADMIN') {
      reply.status(403).send({ error: 'Acesso restrito a administradores' })
    }
  } catch {
    reply.status(401).send({ error: 'Autenticação necessária' })
  }
}

export function getAuthUser(request: FastifyRequest): { userId: number; userRole: string } {
  const user = request.user as { sub: number; role: string }
  return { userId: user.sub, userRole: user.role ?? 'USER' }
}
