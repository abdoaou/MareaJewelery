import { wheelService } from './wheel.service.js'
import { success } from '../../shared/utils/response.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'

function sessionId(req) {
  return req.headers['x-session-id'] || null
}

export const wheelController = {
  listPrizes: asyncHandler(async (_req, res) => {
    const data = await wheelService.listPublicPrizes()
    return success(res, { data })
  }),

  status: asyncHandler(async (req, res) => {
    const data = await wheelService.getStatus({
      userId: req.user?.id,
      sessionId: sessionId(req),
    })
    return success(res, { data })
  }),

  spin: asyncHandler(async (req, res) => {
    const data = await wheelService.spin({
      userId: req.user?.id,
      sessionId: sessionId(req),
    })
    return success(res, { data, message: data.alreadyUsed ? 'Already spun' : 'Spin complete' })
  }),

  claim: asyncHandler(async (req, res) => {
    const data = await wheelService.claim({
      userId: req.user.id,
      sessionId: sessionId(req),
      spinId: req.body.spinId,
    })
    return success(res, { data, message: 'Prize claimed' })
  }),

  adminStats: asyncHandler(async (_req, res) => {
    const data = await wheelService.adminStats()
    return success(res, { data })
  }),

  adminListPrizes: asyncHandler(async (_req, res) => {
    const data = await wheelService.adminListPrizes()
    return success(res, { data })
  }),

  adminCreatePrize: asyncHandler(async (req, res) => {
    const data = await wheelService.adminCreatePrize(req.body)
    return success(res, { data, status: 201, message: 'Prize created' })
  }),

  adminUpdatePrize: asyncHandler(async (req, res) => {
    const data = await wheelService.adminUpdatePrize(req.params.id, req.body)
    return success(res, { data, message: 'Prize updated' })
  }),

  adminDeletePrize: asyncHandler(async (req, res) => {
    const data = await wheelService.adminDeletePrize(req.params.id)
    return success(res, { data, message: 'Prize deactivated' })
  }),

  adminListSpins: asyncHandler(async (req, res) => {
    const data = await wheelService.adminListSpins(req.query)
    return success(res, {
      data: data.items,
      meta: { total: data.total, page: data.page, limit: data.limit, totalPages: data.totalPages },
    })
  }),
}
