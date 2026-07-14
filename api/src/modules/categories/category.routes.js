import { Router } from 'express'
import { categoryController } from './category.controller.js'
import { authenticate, adminOnly } from '../../shared/middleware/auth.js'

const router = Router()

router.get('/', categoryController.list)
router.get('/tree', categoryController.tree)
router.get('/slug/:slug', categoryController.getBySlug)
router.get('/:id', categoryController.get)
router.post('/', authenticate, adminOnly, categoryController.create)
router.patch('/:id', authenticate, adminOnly, categoryController.update)
router.delete('/:id', authenticate, adminOnly, categoryController.remove)

export default router
