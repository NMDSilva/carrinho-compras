import { vi, beforeEach } from 'vitest'
import { mockReset } from 'vitest-mock-extended'
import { prismaMock } from './mocks/prisma'

process.env.JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

vi.mock('../src/lib/prisma', () => ({
  default: prismaMock,
}))

beforeEach(() => {
  mockReset(prismaMock)
})
