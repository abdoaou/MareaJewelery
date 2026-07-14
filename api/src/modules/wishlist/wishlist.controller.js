import { wishlistService } from './wishlist.service.js'
import { success } from '../../shared/utils/response.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'

export const wishlistController = {
  list: asyncHandler(async (req, res) => {
    const data = await wishlistService.list(req.user.id)
    return success(res, { data })
  }),
  ids: asyncHandler(async (req, res) => {
    const data = await wishlistService.ids(req.user.id)
    return success(res, { data })
  }),
  toggle: asyncHandler(async (req, res) => {
    const data = await wishlistService.toggle(req.user.id, req.params.productId)
    return success(res, { data, message: data.liked ? 'Liked' : 'Unliked' })
  }),
  add: asyncHandler(async (req, res) => {
    const data = await wishlistService.add(req.user.id, req.params.productId)
    return success(res, { data, status: 201, message: 'Liked' })
  }),
  remove: asyncHandler(async (req, res) => {
    const data = await wishlistService.remove(req.user.id, req.params.productId)
    return success(res, { data, message: 'Removed from likes' })
  }),
}
