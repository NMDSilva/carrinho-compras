import { vi, beforeEach } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { prismaMock } from './mocks/prisma'

process.env.JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

vi.mock('../src/shared/lib/prisma', () => ({
  default: prismaMock,
}))

// A verificação de sessão (tokenVersion) corre em cada pedido autenticado,
// antes de qualquer controller. Se usasse o prismaMock diretamente, consumia os
// `mockResolvedValueOnce` de `user.findUnique` que os testes preparam para os
// controllers — daí viver num módulo próprio e ser mockada aqui.
//
// Por omissão devolve 0, que é a tokenVersion de quem acabou de entrar: os
// tokens do helper `authHeader` são aceites sem cada teste ter de tratar disto.
// Os testes de revogação (`auth.middleware.test.ts`) sobrepõem-se a este valor.
export const getTokenVersionMock = vi.fn(async () => 0 as number | null)

vi.mock('../src/shared/lib/session', () => ({
  getTokenVersion: getTokenVersionMock,
}))

beforeEach(() => {
  mockReset(prismaMock)
  getTokenVersionMock.mockReset()
  getTokenVersionMock.mockResolvedValue(0)
})
