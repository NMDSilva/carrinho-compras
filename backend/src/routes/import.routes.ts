import { Router } from 'express'
import multer from 'multer'
import { previewInvoice, confirmImport } from '../controllers/import.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

// Multer em memória — o PDF não é guardado em disco
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Apenas ficheiros PDF são aceites'))
  },
})

router.post('/preview', requireAuth, upload.single('invoice'), previewInvoice)
router.post('/confirm', requireAuth, confirmImport)

export default router
