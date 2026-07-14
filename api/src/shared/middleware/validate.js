import { ValidationError } from '../errors/AppError.js'

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    })

    if (!result.success) {
      const details = result.error.flatten()
      return next(new ValidationError('Validation failed', details))
    }

    if (result.data.body) req.body = result.data.body
    if (result.data.query) req.query = result.data.query
    if (result.data.params) req.params = result.data.params
    next()
  }
}
