import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'

export const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>
