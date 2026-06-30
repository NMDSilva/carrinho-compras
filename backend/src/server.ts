import 'dotenv/config'
import { buildApp } from './app'

async function start() {
  const app = await buildApp()

  const PORT = Number(process.env.PORT) || 3000
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`\n🛒 Carrinho de Compras API`)
  console.log(`   Servidor a correr em: http://localhost:${PORT}`)
  console.log(`   Docs disponíveis em:  http://localhost:${PORT}/docs`)
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
