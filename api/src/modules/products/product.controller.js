import { productService } from './product.service.js'
import { success } from '../../shared/utils/response.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'

export const productController = {
  list: asyncHandler(async (req, res) => {
    const data = await productService.list(req.query)
    return success(res, { data: data.items, meta: { total: data.total, page: data.page, limit: data.limit } })
  }),
  get: asyncHandler(async (req, res) => {
    const data = await productService.getById(req.params.id)
    return success(res, { data })
  }),
  getBySlug: asyncHandler(async (req, res) => {
    const data = await productService.getBySlug(req.params.slug)
    return success(res, { data })
  }),
  create: asyncHandler(async (req, res) => {
    const data = await productService.create(req.body)
    return success(res, { data, status: 201 })
  }),
  update: asyncHandler(async (req, res) => {
    const data = await productService.update(req.params.id, req.body)
    return success(res, { data })
  }),
  remove: asyncHandler(async (req, res) => {
    await productService.remove(req.params.id)
    return success(res, { message: 'Product deleted' })
  }),
  restore: asyncHandler(async (req, res) => {
    const data = await productService.restore(req.params.id)
    return success(res, { data })
  }),
  duplicate: asyncHandler(async (req, res) => {
    const data = await productService.duplicate(req.params.id)
    return success(res, { data, status: 201 })
  }),
  addImages: asyncHandler(async (req, res) => {
    const data = await productService.addImages(req.params.id, req.body.images || [])
    return success(res, { data })
  }),
  removeImage: asyncHandler(async (req, res) => {
    const data = await productService.removeImage(req.params.id, req.params.imageId)
    return success(res, { data })
  }),
  setPrimaryImage: asyncHandler(async (req, res) => {
    const data = await productService.setPrimaryImage(req.params.id, req.params.imageId)
    return success(res, { data })
  }),
}
