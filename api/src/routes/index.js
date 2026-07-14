import { Router } from 'express'
import authRoutes from '../modules/auth/auth.routes.js'
import productRoutes from '../modules/products/product.routes.js'
import categoryRoutes from '../modules/categories/category.routes.js'
import cartRoutes from '../modules/cart/cart.routes.js'
import orderRoutes from '../modules/orders/order.routes.js'
import adminRoutes from '../modules/admin/admin.routes.js'
import publicRoutes from '../modules/public/public.routes.js'
import wishlistRoutes from '../modules/wishlist/wishlist.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/products', productRoutes)
router.use('/categories', categoryRoutes)
router.use('/cart', cartRoutes)
router.use('/orders', orderRoutes)
router.use('/admin', adminRoutes)
router.use('/public', publicRoutes)
router.use('/wishlist', wishlistRoutes)

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Marea E-Commerce API is running',
    version: process.env.API_VERSION || 'v1',
    timestamp: new Date().toISOString(),
  })
})

export default router
