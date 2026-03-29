import { Router } from 'express'
import {
  getSupermarkets,
  getSupermarket,
  createSupermarket,
  updateSupermarket,
  deleteSupermarket,
} from '../controllers/supermarkets.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

router.get('/', getSupermarkets)
router.get('/:id', getSupermarket)
router.post('/', requireAuth, createSupermarket)
router.put('/:id', requireAuth, updateSupermarket)
router.delete('/:id', requireAuth, deleteSupermarket)

export default router
