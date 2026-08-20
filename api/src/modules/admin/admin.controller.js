import { adminService } from './admin.service.js'
import { success } from '../../shared/utils/response.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'

export const adminController = {
  dashboard: asyncHandler(async (_req, res) => success(res, { data: await adminService.dashboardStats() })),
  charts: asyncHandler(async (_req, res) => success(res, { data: await adminService.chartData() })),
  notifications: asyncHandler(async (req, res) =>
    success(res, { data: await adminService.getNotifications(Number(req.query.limit) || 50) }),
  ),
  markNotificationRead: asyncHandler(async (req, res) => {
    const data = await adminService.markNotificationRead(req.params.id)
    return success(res, { data })
  }),
  markAllNotificationsRead: asyncHandler(async (_req, res) => {
    await adminService.markAllNotificationsRead()
    return success(res, { message: 'All notifications marked as read' })
  }),
  inventory: asyncHandler(async (req, res) =>
    success(res, { data: await adminService.listInventory(req.query) }),
  ),
  adjustStock: asyncHandler(async (req, res) => {
    const data = await adminService.adjustStock({
      ...req.body,
      userId: req.user.id,
      ipAddress: req.ip,
    })
    return success(res, { data, message: 'Stock updated' })
  }),
  stockMovements: asyncHandler(async (req, res) =>
    success(res, { data: await adminService.getStockMovements(Number(req.query.limit) || 50) }),
  ),
  customers: asyncHandler(async (req, res) =>
    success(res, { data: await adminService.listCustomers(req.query) }),
  ),
  broadcastCustomerEmail: asyncHandler(async (req, res) => {
    const data = await adminService.broadcastCustomerEmail({
      subject: req.body.subject,
      message: req.body.message,
      adminId: req.user.id,
      adminEmail: req.user.email,
    })
    return success(res, {
      data,
      message: `Sent ${data.sent} of ${data.total} customer emails`,
    })
  }),
  testCustomerEmail: asyncHandler(async (req, res) => {
    const data = await adminService.sendTestCustomerEmail({
      subject: req.body.subject,
      message: req.body.message,
      adminId: req.user.id,
      adminEmail: req.user.email,
      adminFirstName: req.user.firstName,
    })
    return success(res, { data, message: `Test email sent to ${data.to}` })
  }),
  auditLogs: asyncHandler(async (req, res) =>
    success(res, { data: await adminService.getAuditLogs(Number(req.query.limit) || 50) }),
  ),
  adminLogs: asyncHandler(async (req, res) =>
    success(res, { data: await adminService.getAdminLogs(Number(req.query.limit) || 50) }),
  ),
  resetAnalytics: asyncHandler(async (_req, res) => {
    const data = await adminService.resetAnalytics()
    return success(res, { data, message: 'Analytics reset to zero' })
  }),
}
