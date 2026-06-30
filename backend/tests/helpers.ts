import type { FastifyInstance } from 'fastify'

export function authHeader(app: FastifyInstance, payload: { sub: number; role: string }) {
  const token = app.jwt.sign(payload)
  return { authorization: `Bearer ${token}` }
}
