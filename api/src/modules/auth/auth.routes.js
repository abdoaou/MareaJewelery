import { Router } from 'express'
import { authController } from './auth.controller.js'
import { validate } from '../../shared/middleware/validate.js'
import { authenticate } from '../../shared/middleware/auth.js'
import { authLimiter } from '../../shared/middleware/rateLimiter.js'
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  verifyEmailCodeSchema,
  resendVerificationSchema,
} from './auth.validation.js'

const router = Router()

router.post('/register', authLimiter, validate(registerSchema), authController.register)
router.post('/login', authLimiter, validate(loginSchema), authController.login)

router.post('/refresh', validate(refreshSchema), authController.refresh)
router.post('/logout', authController.logout)
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword)
router.get('/verify-email/:token', authController.verifyEmail)
router.post('/verify-email', authLimiter, validate(verifyEmailCodeSchema), authController.verifyEmailCode)
router.post('/resend-verification', authLimiter, validate(resendVerificationSchema), authController.resendVerification)

router.get('/me', authenticate, authController.getProfile)
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateProfile)
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword)
router.delete('/me', authenticate, authController.deleteAccount)

export default router
