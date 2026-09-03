import { Router } from 'express'
import { wheelController } from './wheel.controller.js'
import { authenticate, adminOnly, optionalAuth } from '../../shared/middleware/auth.js'

const router = Router()

router.get('/prizes', wheelController.listPrizes)
router.get('/status', optionalAuth, wheelController.status)
router.post('/spin', optionalAuth, wheelController.spin)
router.post('/claim', authenticate, wheelController.claim)

router.use(authenticate, adminOnly)
router.get('/admin/stats', wheelController.adminStats)
router.get('/admin/prizes', wheelController.adminListPrizes)
router.post('/admin/prizes', wheelController.adminCreatePrize)
router.patch('/admin/prizes/:id', wheelController.adminUpdatePrize)
router.delete('/admin/prizes/:id', wheelController.adminDeletePrize)
router.get('/admin/spins', wheelController.adminListSpins)

export default router
