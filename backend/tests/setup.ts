import { vi, beforeEach } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { prismaMock } from './mocks/prisma'

process.env.JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

vi.mock('../src/shared/lib/prisma', () => ({
  default: prismaMock,
}))

beforeEach(() => {
  mockReset(prismaMock)
})
