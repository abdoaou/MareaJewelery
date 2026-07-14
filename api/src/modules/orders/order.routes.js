import { Router } from 'express'
import { orderController } from './order.controller.js'
import { authenticate, adminOnly, optionalAuth } from '../../shared/middleware/auth.js'

const router = Router()

router.post('/', optionalAuth, orderController.create)
router.use(authenticate)
router.post('/admin', adminOnly, orderController.adminCreate)
router.get('/', orderController.list)
router.get('/:id', orderController.get)
router.patch('/:id/status', adminOnly, orderController.updateStatus)

export default router
