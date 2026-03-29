import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrate: {
    async adapter() {
      const { PrismaLibSql } = await import('@prisma/adapter-libsql')
      return new PrismaLibSql({
        url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
      })
    },
  },
})
