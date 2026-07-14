import { categoryRepository } from './category.repository.js'
import { NotFoundError } from '../../shared/errors/AppError.js'

export const categoryService = {
  getTree: () => categoryRepository.findTree(),
  list: () => categoryRepository.findAll(),
  getById: async (id) => {
    const cat = await categoryRepository.findById(id)
    if (!cat) throw new NotFoundError('Category')
    return cat
  },
  getBySlug: async (slug) => {
    const cat = await categoryRepository.findBySlug(slug)
    if (!cat) throw new NotFoundError('Category')
    return cat
  },
  create: (data) => categoryRepository.create(data),
  update: async (id, data) => {
    await categoryService.getById(id)
    return categoryRepository.update(id, data)
  },
  remove: async (id) => {
    await categoryService.getById(id)
    return categoryRepository.softDelete(id)
  },
}
