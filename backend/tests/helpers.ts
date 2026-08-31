import type { FastifyInstance } from 'fastify'

// `tv` é a versão de sessão (ver tokenVersion no schema). Omitido, o token fica
// como os que foram emitidos antes desta funcionalidade existir — continuam a
// ser aceites. O mock global em `setup.ts` devolve 0, por isso `tv: 0` também
// passa; usa-se outro valor para simular um token revogado.
export function authHeader(
  app: FastifyInstance,
  payload: { sub: number; role: string; tv?: number }
) {
  const token = app.jwt.sign(payload)
  return { authorization: `Bearer ${token}` }
}
