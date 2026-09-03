import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Sem fallback de propósito. Isto já teve uma connection string completa
// embutida, com password real — que ficou pública quando o repositório passou a
// público, e continua no histórico do git (commit 8d44e9b em diante). Uma
// credencial no código é sempre um erro, mesmo em repositório privado: acaba em
// dumps, em screenshots e no histórico para sempre.
//
// Faltando a variável, a app tem de falhar a arrancar em vez de se ligar a uma
// base com credenciais adivinháveis.
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error(
    'DATABASE_URL não está definida. Copia backend/.env.example para backend/.env e preenche-a.'
  )
}

const adapter = new PrismaPg({ connectionString })

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

export default prisma
