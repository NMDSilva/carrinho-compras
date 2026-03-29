import { Router } from 'express'
import {
  getProducts,
  getProduct,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/products.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

router.get('/categories', getCategories)
router.get('/', getProducts)
router.get('/:id', getProduct)
router.post('/', requireAuth, createProduct)
router.put('/:id', requireAuth, updateProduct)
router.delete('/:id', requireAuth, deleteProduct)

export default router
