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

const router = Router()

router.get('/dashboard', getDashboardStats)
router.get('/compare/:productId', compareProductPrices)
router.get('/history/:productId', getPriceHistory)
router.get('/', getPrices)
router.post('/', createPrice)
router.put('/:id', updatePrice)
router.delete('/:id', deletePrice)

export default router
