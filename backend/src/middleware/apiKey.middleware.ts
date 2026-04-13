import { FastifyRequest, FastifyReply } from 'fastify'

export async function requireApiKey(request: FastifyRequest, reply: FastifyReply) {
  const key = request.headers['x-api-key']
  const expected = process.env.N8N_API_KEY

  if (!expected) {
    return reply.status(500).send({ error: 'API key não configurada no servidor' })
  }

  if (!key || key !== expected) {
    return reply.status(401).send({ error: 'API key inválida ou ausente' })
  }
}
