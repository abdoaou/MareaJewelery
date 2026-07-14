import { authService } from './auth.service.js'
import { success } from '../../shared/utils/response.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'

const meta = (req) => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  sessionId: req.headers['x-session-id'],
})

export const authController = {
  register: asyncHandler(async (req, res) => {
    const data = await authService.register(req.body, meta(req))
    return success(res, { data, message: 'Registration successful', status: 201 })
  }),

  login: asyncHandler(async (req, res) => {
    const data = await authService.login(req.body, meta(req))
    return success(res, { data })
  }),

  refresh: asyncHandler(async (req, res) => {
    const data = await authService.refresh(req.body.refreshToken)
    return success(res, { data })
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(req.body.refreshToken, req.user?.id)
    return success(res, { message: 'Logged out' })
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const data = await authService.forgotPassword(req.body.email)
    return success(res, { data })
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password, req.body.email)
    return success(res, { message: 'Password reset successful' })
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    await authService.verifyEmail(req.params.token)
    return success(res, { message: 'Email verified' })
  }),

  verifyEmailCode: asyncHandler(async (req, res) => {
    const data = await authService.verifyEmailCode(req.body, meta(req))
    return success(res, { data, message: 'Email verified' })
  }),

  resendVerification: asyncHandler(async (req, res) => {
    const data = await authService.resendVerification(req.body.email)
    return success(res, { data })
  }),

  changePassword: asyncHandler(async (req, res) => {
    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword)
    return success(res, { message: 'Password changed' })
  }),

  getProfile: asyncHandler(async (req, res) => {
    const data = await authService.getProfile(req.user.id)
    return success(res, { data })
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const data = await authService.updateProfile(req.user.id, req.body)
    return success(res, { data })
  }),

  deleteAccount: asyncHandler(async (req, res) => {
    await authService.deleteAccount(req.user.id)
    return success(res, { message: 'Account deleted' })
  }),
}
