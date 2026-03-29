import { Router } from 'express'
import {
  getSupermarkets,
  getSupermarket,
  createSupermarket,
  updateSupermarket,
  deleteSupermarket,
} from '../controllers/supermarkets.controller'

const router = Router()

router.get('/', getSupermarkets)
router.get('/:id', getSupermarket)
router.post('/', createSupermarket)
router.put('/:id', updateSupermarket)
router.delete('/:id', deleteSupermarket)

export default router
