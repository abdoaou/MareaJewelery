import { Router } from 'express'
import { productController } from './product.controller.js'
import { authenticate, adminOnly, optionalAuth } from '../../shared/middleware/auth.js'

const router = Router()

router.get('/', optionalAuth, productController.list)
router.get('/slug/:slug', productController.getBySlug)
router.get('/:id', productController.get)

router.post('/', authenticate, adminOnly, productController.create)
router.patch('/:id', authenticate, adminOnly, productController.update)
router.delete('/:id', authenticate, adminOnly, productController.remove)
router.post('/:id/restore', authenticate, adminOnly, productController.restore)
router.post('/:id/duplicate', authenticate, adminOnly, productController.duplicate)
router.post('/:id/images', authenticate, adminOnly, productController.addImages)
router.patch('/:id/images/:imageId/primary', authenticate, adminOnly, productController.setPrimaryImage)
router.delete('/:id/images/:imageId', authenticate, adminOnly, productController.removeImage)

export default router
