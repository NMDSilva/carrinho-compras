/// <reference types="node" />
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://carrinho:password@localhost:5432/carrinho_compras',
  },
})
