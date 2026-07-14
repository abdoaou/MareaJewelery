export function success(res, { data = null, message = 'Success', status = 200, meta = null } = {}) {
  const body = { success: true, message, data }
  if (meta) body.meta = meta
  return res.status(status).json(body)
}

export function fail(res, { message = 'Error', status = 500, code = 'ERROR', details = null } = {}) {
  const body = { success: false, message, code }
  if (details) body.details = details
  return res.status(status).json(body)
}
