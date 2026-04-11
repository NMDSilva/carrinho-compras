import { Router } from 'express'
import { registarCompra } from '../controllers/compras.controller'
import { requireApiKey } from '../middleware/apiKey.middleware'

const router = Router()

router.post('/', requireApiKey, registarCompra)

export default router
