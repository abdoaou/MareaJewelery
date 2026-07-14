import { categoryService } from './category.service.js'
import { success } from '../../shared/utils/response.js'
import { asyncHandler } from '../../shared/utils/asyncHandler.js'

export const categoryController = {
  tree: asyncHandler(async (_req, res) => success(res, { data: await categoryService.getTree() })),
  list: asyncHandler(async (_req, res) => success(res, { data: await categoryService.list() })),
  getBySlug: asyncHandler(async (req, res) =>
    success(res, { data: await categoryService.getBySlug(req.params.slug) }),
  ),
  get: asyncHandler(async (req, res) => success(res, { data: await categoryService.getById(req.params.id) })),
  create: asyncHandler(async (req, res) => success(res, { data: await categoryService.create(req.body), status: 201 })),
  update: asyncHandler(async (req, res) => success(res, { data: await categoryService.update(req.params.id, req.body) })),
  remove: asyncHandler(async (req, res) => {
    await categoryService.remove(req.params.id)
    return success(res, { message: 'Category deleted' })
  }),
}
