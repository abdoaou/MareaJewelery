import { Router } from 'express'
import { cartController } from './cart.controller.js'
import { optionalAuth } from '../../shared/middleware/auth.js'

const router = Router()

router.use(optionalAuth)
router.get('/', cartController.get)
router.post('/items', cartController.addItem)
router.patch('/items/:itemId', cartController.updateItem)
router.delete('/items/:itemId', cartController.removeItem)

export default router
