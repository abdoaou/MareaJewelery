import { Router } from 'express'
import { wishlistController } from './wishlist.controller.js'
import { authenticate } from '../../shared/middleware/auth.js'

const router = Router()

router.use(authenticate)
router.get('/', wishlistController.list)
router.get('/ids', wishlistController.ids)
router.post('/:productId/toggle', wishlistController.toggle)
router.post('/:productId', wishlistController.add)
router.delete('/:productId', wishlistController.remove)

export default router
