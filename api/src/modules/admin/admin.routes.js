import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { adminController } from './admin.controller.js'
import { authenticate, adminOnly } from '../../shared/middleware/auth.js'
import { uploadImages, isR2Enabled } from '../../shared/storage/r2.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'
import { success } from '../../shared/utils/response.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  },
})

const router = Router()
router.use(authenticate, adminOnly)

router.get('/dashboard', adminController.dashboard)
router.get('/charts', adminController.charts)
router.get('/notifications', adminController.notifications)
router.patch('/notifications/read-all', adminController.markAllNotificationsRead)
router.patch('/notifications/:id/read', adminController.markNotificationRead)
router.get('/inventory', adminController.inventory)
router.post('/inventory/adjust', adminController.adjustStock)
router.get('/stock-movements', adminController.stockMovements)
router.get('/customers', adminController.customers)
router.post('/customers/broadcast-email', adminController.broadcastCustomerEmail)
router.post('/customers/test-email', adminController.testCustomerEmail)
router.get('/audit-logs', adminController.auditLogs)
router.get('/admin-logs', adminController.adminLogs)

router.post(
  '/upload',
  upload.array('images', 10),
  asyncHandler(async (req, res) => {
    const files = await uploadImages(req.files || [], { folder: 'products' })
    return success(res, {
      data: files,
      message: isR2Enabled() ? 'Uploaded to Cloudflare R2' : 'Uploaded locally (R2 not configured)',
    })
  }),
)

export default router
