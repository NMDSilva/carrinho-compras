import prisma from './prisma'

/**
 * Versão de sessão atual do utilizador, ou `null` se a conta já não existir.
 *
 * Vive num módulo próprio (e não dentro do `auth.middleware`) porque é chamada
 * em cada pedido autenticado, antes de qualquer controller: manter a leitura
 * isolada dá aos testes um ponto de mock estável, em vez de esta consulta
 * competir com os `mockResolvedValueOnce` de `user.findUnique` que os testes
 * preparam para os controllers.
 */
export async function getTokenVersion(userId: number): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  })
  return user ? user.tokenVersion : null
}
