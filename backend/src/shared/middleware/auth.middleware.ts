import { FastifyRequest, FastifyReply } from 'fastify'
import { getTokenVersion } from '../lib/session'

type JwtPayload = { sub: number; role: string; tv?: number }

// O JWT sozinho não chega: um token continua criptograficamente válido até
// expirar (7 dias), mesmo depois de a password ter sido reposta. O payload leva
// `tv` (tokenVersion) e comparamo-lo com o valor guardado no utilizador — mudar
// a password incrementa a coluna e invalida de imediato tudo o que foi emitido
// antes. Custo: uma consulta por pedido autenticado, por chave primária e a
// selecionar uma só coluna.
//
// Tokens emitidos antes desta funcionalidade não têm `tv`. São aceites (o
// utilizador não é expulso por causa do deploy) mas deixam de o ser assim que a
// password mudar, que é exatamente o caso que isto tem de cobrir.
async function sessaoValida(request: FastifyRequest): Promise<boolean> {
  const payload = request.user as JwtPayload
  const versaoAtual = await getTokenVersion(payload.sub)
  if (versaoAtual === null) return false
  if (payload.tv === undefined) return true
  return payload.tv === versaoAtual
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Autenticação necessária' })
  }
  if (!(await sessaoValida(request))) {
    return reply.status(401).send({ error: 'Sessão expirada, volta a entrar' })
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Autenticação necessária' })
  }
  if (!(await sessaoValida(request))) {
    return reply.status(401).send({ error: 'Sessão expirada, volta a entrar' })
  }
  const user = request.user as JwtPayload
  if (user.role !== 'ADMIN') {
    return reply.status(403).send({ error: 'Acesso restrito a administradores' })
  }
}

export function getAuthUser(request: FastifyRequest): { userId: number; userRole: string } {
  const user = request.user as JwtPayload
  return { userId: user.sub, userRole: user.role ?? 'USER' }
}
