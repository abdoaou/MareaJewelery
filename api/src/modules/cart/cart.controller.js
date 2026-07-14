import { cartService } from './cart.service.js'
import { success } from '../../shared/utils/response.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'

const ctx = (req) => ({
  userId: req.user?.id,
  sessionId: req.headers['x-session-id'],
})

export const cartController = {
  get: asyncHandler(async (req, res) => success(res, { data: await cartService.get(ctx(req)) })),
  addItem: asyncHandler(async (req, res) => {
    const data = await cartService.addItem(ctx(req), req.body)
    return success(res, { data, status: 201 })
  }),
  updateItem: asyncHandler(async (req, res) => {
    const data = await cartService.updateItem(ctx(req), req.params.itemId, Number(req.body.quantity))
    return success(res, { data })
  }),
  removeItem: asyncHandler(async (req, res) => {
    const data = await cartService.removeItem(ctx(req), req.params.itemId)
    return success(res, { data })
  }),
}
