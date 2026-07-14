import { orderService } from './order.service.js'
import { success } from '../../shared/utils/response.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'

const isAdmin = (user) => ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER'].includes(user?.role)

export const orderController = {
  create: asyncHandler(async (req, res) => {
    const data = await orderService.create(req.user?.id, req.body)
    return success(res, { data, status: 201, message: 'Order placed' })
  }),
  adminCreate: asyncHandler(async (req, res) => {
    const data = await orderService.adminCreate(req.user.id, req.body)
    return success(res, { data, status: 201, message: 'Order created' })
  }),
  list: asyncHandler(async (req, res) => {
    const data = await orderService.list(req.user.id, isAdmin(req.user), req.query)
    return success(res, { data: data.items, meta: { total: data.total, page: data.page, limit: data.limit, totalPages: data.totalPages } })
  }),
  get: asyncHandler(async (req, res) => {
    const data = await orderService.getById(req.params.id, req.user.id, isAdmin(req.user))
    return success(res, { data })
  }),
  updateStatus: asyncHandler(async (req, res) => {
    const data = await orderService.updateStatus(req.params.id, req.body.status, req.body.note, req.user.id)
    return success(res, { data })
  }),
}
