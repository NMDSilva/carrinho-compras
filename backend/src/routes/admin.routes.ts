import { Router } from 'express'
import { listUsers, getUser, updateUser, deleteUser } from '../controllers/users.controller'
import { requireAdmin } from '../middleware/auth.middleware'

const router = Router()

router.use(requireAdmin)

router.get('/users', listUsers)
router.get('/users/:id', getUser)
router.patch('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

export default router
