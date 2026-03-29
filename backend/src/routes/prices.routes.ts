import { Router } from 'express'
import {
  getPrices,
  createPrice,
  updatePrice,
  deletePrice,
  compareProductPrices,
  getPriceHistory,
  getDashboardStats,
} from '../controllers/prices.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

router.get('/dashboard', getDashboardStats)
router.get('/compare/:productId', compareProductPrices)
router.get('/history/:productId', getPriceHistory)
router.get('/', getPrices)
router.post('/', requireAuth, createPrice)
router.put('/:id', requireAuth, updatePrice)
router.delete('/:id', requireAuth, deletePrice)

export default router
