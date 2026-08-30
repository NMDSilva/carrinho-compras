import { timingSafeEqual } from 'node:crypto'
import { FastifyRequest, FastifyReply } from 'fastify'

// Comparação em tempo constante — evita que a duração da resposta revele,
// byte a byte, até onde a key recebida coincide com a esperada.
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export async function requireApiKey(request: FastifyRequest, reply: FastifyReply) {
  const key = request.headers['x-api-key']
  const expected = process.env.N8N_API_KEY

  if (!expected) {
    return reply.status(500).send({ error: 'API key não configurada no servidor' })
  }

  if (typeof key !== 'string' || !safeCompare(key, expected)) {
    return reply.status(401).send({ error: 'API key inválida ou ausente' })
  }
}
