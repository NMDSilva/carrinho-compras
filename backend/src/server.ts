import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import productsRouter from './routes/products.routes'
import supermarketsRouter from './routes/supermarkets.routes'
import pricesRouter from './routes/prices.routes'
import authRouter from './routes/auth.routes'
import adminRouter from './routes/admin.routes'
import importRouter from './routes/import.routes'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api/import', importRouter)
app.use('/api/products', productsRouter)
app.use('/api/supermarkets', supermarketsRouter)
app.use('/api/prices', pricesRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`\n🛒 Carrinho de Compras API`)
  console.log(`   Servidor a correr em: http://localhost:${PORT}`)
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`)
})

export default app
