import type { ApiResponse, Category, DashboardStats, InventoryRow, Notification, Order, Product, User } from '../types'

const BASE = import.meta.env.VITE_API_URL || '/api/v1'

function getToken() {
  return localStorage.getItem('admin_access_token')
}

function getRefreshToken() {
  return localStorage.getItem('admin_refresh_token')
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('admin_access_token', access)
  localStorage.setItem('admin_refresh_token', refresh)
}

export function clearTokens() {
  localStorage.removeItem('admin_access_token')
  localStorage.removeItem('admin_refresh_token')
}

async function readJson(res: Response) {
  const text = await res.text()
  if (!text) {
    throw new Error(
      res.status === 0 || res.status >= 500
        ? 'Cannot reach the API. Make sure it is running on port 3000.'
        : `Empty response from server (${res.status})`,
    )
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Invalid server response (${res.status})`)
  }
}

function isAuthPublicPath(path: string) {
  return (
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/refresh') ||
    path.startsWith('/auth/forgot-password') ||
    path.startsWith('/auth/reset-password')
  )
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const json = await readJson(res)
    if (!json?.data?.accessToken || !json?.data?.refreshToken) return false
    setTokens(json.data.accessToken, json.data.refreshToken)
    return true
  } catch {
    return false
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  }

  // Never attach a stale Bearer token to public auth calls (breaks login error handling)
  const publicAuth = isAuthPublicPath(path)
  const token = getToken()
  if (token && !publicAuth) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers })
  } catch {
    throw new Error('Cannot reach the API. Make sure it is running on port 3000.')
  }

  if (res.status === 401 && retry && !publicAuth) {
    const ok = await refreshAccessToken()
    if (ok) return api(path, options, false)
    clearTokens()
    const adminBase = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
    const loginPath = `${adminBase}/login`
    if (!window.location.pathname.endsWith('/login') && !window.location.pathname.endsWith('/login/')) {
      window.location.href = loginPath
    }
    throw new Error('Session expired. Please sign in again.')
  }

  const json = await readJson(res)
  if (!res.ok) throw new Error(json.message || 'Request failed')
  return json
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => api<User>('/auth/me'),
  logout: () => {
    const refreshToken = getRefreshToken()
    return api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) })
  },
}

export const dashboardApi = {
  stats: () => api<DashboardStats>('/admin/dashboard'),
  charts: () => api<Record<string, unknown>>('/admin/charts'),
  notifications: () => api<Notification[]>('/admin/notifications'),
  markRead: (id: string) => api(`/admin/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => api('/admin/notifications/read-all', { method: 'PATCH' }),
}

export const ordersApi = {
  list: (params: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return api<Order[]>(`/orders?${q}`)
  },
  get: (id: string) => api<Order>(`/orders/${id}`),
  create: (data: {
    userId: string
    items: { productId: string; quantity: number }[]
    paymentMethod?: string
    shippingAddress?: object
    customerNotes?: string
    adminNotes?: string
    status?: string
  }) => api<Order>('/orders/admin', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string, note?: string) =>
    api(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
}

export const productsApi = {
  list: (params: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return api<Product[]>(`/products?${q}`)
  },
  get: (id: string) => api<Product>(`/products/${id}`),
  create: (data: Partial<Product>) =>
    api<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Product>) =>
    api<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api(`/products/${id}`, { method: 'DELETE' }),
  duplicate: (id: string) => api<Product>(`/products/${id}/duplicate`, { method: 'POST' }),
  addImages: (id: string, images: { url: string; alt?: string; isPrimary?: boolean; sortOrder?: number }[]) =>
    api(`/products/${id}/images`, { method: 'POST', body: JSON.stringify({ images }) }),
  removeImage: (id: string, imageId: string) =>
    api(`/products/${id}/images/${imageId}`, { method: 'DELETE' }),
  setPrimaryImage: (id: string, imageId: string) =>
    api(`/products/${id}/images/${imageId}/primary`, { method: 'PATCH' }),
  upload: async (files: File[] | FileList) => {
    const fd = new FormData()
    Array.from(files).forEach((f) => fd.append('images', f))
    const token = getToken()
    const res = await fetch(`${BASE}/admin/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    })
    const text = await res.text()
    if (!text) throw new Error('Upload failed: empty response from server')
    let json
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error('Upload failed: invalid server response')
    }
    if (!res.ok) throw new Error(json.message || 'Upload failed')
    return json.data as { url: string }[]
  },
}

export const categoriesApi = {
  list: () => api<Category[]>('/categories'),
  tree: () => api<Category[]>('/categories/tree'),
  create: (data: Partial<Category>) =>
    api<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Category>) =>
    api<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => api(`/categories/${id}`, { method: 'DELETE' }),
}

export const inventoryApi = {
  list: (params: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return api<{ items: InventoryRow[]; total: number }>(`/admin/inventory?${q}`)
  },
  adjust: (inventoryId: string, quantity: number, note?: string) =>
    api('/admin/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({ inventoryId, quantity, reason: 'MANUAL_UPDATE', note }),
    }),
  movements: () => api<unknown[]>('/admin/stock-movements'),
}

export const customersApi = {
  list: (params: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return api<{ items: User[]; total: number }>(`/admin/customers?${q}`)
  },
  broadcastEmail: (body: { subject: string; message: string }) =>
    api<{
      sent: number
      skipped?: number
      failed?: number
      total: number
      failures?: Array<{ email: string; error: string }>
    }>('/admin/customers/broadcast-email', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  testEmail: (body: { subject: string; message: string }) =>
    api<{ sent: number; to: string }>('/admin/customers/test-email', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
