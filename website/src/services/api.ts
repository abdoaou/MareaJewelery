import {
  getAccessToken,
  refreshSession,
  setTokens,
  expireSession,
} from './authSession'
import { availableStock } from '../utils/mapProduct'
import { reportError } from './errorReporter'
import i18n from '../i18n'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'
const API_KEY = import.meta.env.VITE_API_KEY || ''

export type ApiRequestInit = RequestInit & { silent?: boolean }

function getSessionId() {
  let id = localStorage.getItem('marea_session_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('marea_session_id', id)
  }
  return id
}

export function setToken(token: string | null, refreshToken?: string | null) {
  setTokens(token, refreshToken)
}

async function rawFetch(path: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    'x-session-id': getSessionId(),
    ...(options.headers as Record<string, string>),
  }
  const access = token === undefined ? getAccessToken() : token
  if (access) headers.Authorization = `Bearer ${access}`

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    const data = await res.json().catch(() => ({}))
    return { res, data }
  } catch {
    throw new Error(i18n.t('common.networkError'))
  }
}

async function request<T>(
  path: string,
  options: ApiRequestInit = {},
  retried = false,
): Promise<T> {
  const { silent, ...fetchOptions } = options
  const { res, data } = await rawFetch(path, fetchOptions)

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    const ok = await refreshSession(API_BASE, API_KEY)
    if (ok) return request<T>(path, options, true)
    expireSession()
    if (!silent) reportError(i18n.t('common.sessionExpired'))
    throw new Error(i18n.t('common.sessionExpired'))
  }

  if (!res.ok) {
    const raw = data.message || i18n.t('common.genericError')
    const message =
      silent && /prisma|max clients|connection pool|too many connections/i.test(String(raw))
        ? i18n.t('common.genericError')
        : raw
    if (!silent && !path.startsWith('/auth/')) reportError(message)
    throw new Error(message)
  }

  return data as T
}



type ApiAuthData = {

  user: {

    id: string

    email: string

    firstName?: string | null

    lastName?: string | null

    phone?: string | null

  }

  accessToken: string

  refreshToken?: string

}



type ApiCart = {

  id: string

  items: Array<{

    id: string

    productId: string

    quantity: number

    product: {

      name: string

      price: string | number

      salePrice?: string | number | null

      images?: Array<{ url: string; isPrimary?: boolean }>

      inventory?: Array<{ currentStock: number; reservedStock: number }>

    }

  }>

}



function splitName(fullName?: string) {

  const trimmed = fullName?.trim()

  if (!trimmed) return { firstName: 'Customer' as const }

  const [first, ...rest] = trimmed.split(/\s+/)

  return { firstName: first, lastName: rest.join(' ') || undefined }

}



function mapAuth(data: ApiAuthData): AuthResponse {
  const fullName = [data.user.firstName, data.user.lastName].filter(Boolean).join(' ')
  return {
    token: data.accessToken,
    refreshToken: data.refreshToken,
    customer: {
      id: data.user.id,
      email: data.user.email,
      full_name: fullName || undefined,
      phone: data.user.phone || undefined,
    },
  }
}



function mapCart(cart: ApiCart | null | undefined): CartResponse {

  if (!cart) return { id: '', items: [] }

  return {

    id: cart.id,

    items: cart.items.map((item) => {

      const img = item.product.images?.find((i) => i.isPrimary) ?? item.product.images?.[0]

      return {

        id: item.id,

        product_id: item.productId,

        quantity: item.quantity,

        name: item.product.name,

        price: item.product.price,

        sale_price: item.product.salePrice,

        stock: availableStock(item.product.inventory),

        image: img?.url,

      }

    }),

  }

}



function mapCheckoutBody(body: CheckoutBody) {

  const address = {

    name: body.customer_name,

    email: body.customer_email,

    phone: body.customer_phone,

    line1: body.address_line1,

    line2: body.address_line2,

    city: body.city,

    state: body.state,

    postalCode: body.postal_code,

    country: body.country,

    latitude: body.latitude,

    longitude: body.longitude,

  }

  return {

    items: body.items.map((i) => ({ productId: i.product_id, quantity: i.quantity })),

    paymentMethod: 'COD',

    customerNotes: body.notes,

    shippingAddress: address,

    billingAddress: address,

    ...(body.coupon_code ? { couponCode: body.coupon_code.trim().toUpperCase() } : {}),

  }

}



type ApiOrderRaw = {

  id: string

  orderNumber: string

  status: string

  paymentStatus: string

  paymentMethod: string

  total: string | number

  subtotal: string | number

  discount?: string | number

  tax?: string | number

  shipping?: string | number

  createdAt: string

  promo?: OrderPromo | null

  items: Array<{

    id: string

    productName: string

    quantity: number

    unitPrice: string | number

    lineTotal: string | number

    product?: {

      images?: Array<{ url: string }>

    }

  }>

  statusHistory?: Array<{

    status: string

    note?: string | null

    createdAt: string

  }>

}



function mapOrder(order: ApiOrderRaw): Order {

  return {

    id: order.id,

    orderNumber: order.orderNumber,

    status: order.status,

    paymentStatus: order.paymentStatus,

    paymentMethod: order.paymentMethod,

    total: Number(order.total),

    subtotal: Number(order.subtotal),

    discount: Number(order.discount || 0),

    tax: Number(order.tax || 0),

    shipping: Number(order.shipping || 0),

    promo: order.promo ?? null,

    createdAt: order.createdAt,

    items: order.items.map((item) => {

      const img = item.product?.images?.[0]

      return {

        id: item.id,

        name: item.productName,

        quantity: item.quantity,

        unitPrice: Number(item.unitPrice),

        lineTotal: Number(item.lineTotal),

        image: img?.url,

      }

    }),

    statusHistory: (order.statusHistory || []).map((s) => ({

      status: s.status,

      note: s.note || undefined,

      createdAt: s.createdAt,

    })),

  }

}



export const api = {

  getProducts: (params?: {
    page?: number
    limit?: number
    status?: string
    categoryId?: string
    categorySlug?: string
    featured?: boolean
    bestSeller?: boolean
    newArrival?: boolean
    recommended?: boolean
    excludeId?: string
    search?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.status) q.set('status', params.status)
    if (params?.categoryId) q.set('categoryId', params.categoryId)
    if (params?.categorySlug) q.set('categorySlug', params.categorySlug)
    if (params?.featured != null) q.set('featured', String(params.featured))
    if (params?.bestSeller != null) q.set('bestSeller', String(params.bestSeller))
    if (params?.newArrival != null) q.set('newArrival', String(params.newArrival))
    if (params?.recommended != null) q.set('recommended', String(params.recommended))
    if (params?.excludeId) q.set('excludeId', params.excludeId)
    if (params?.search) q.set('search', params.search)
    const qs = q.toString()
    return request<{
      data: import('../utils/mapProduct').ApiProduct[]
      meta?: { total: number; page: number; limit: number }
    }>(`/products${qs ? `?${qs}` : ''}`)
  },
  getProductBySlug: (slug: string) =>
    request<{ data: import('../utils/mapProduct').ApiProduct }>(`/products/slug/${slug}`),
  getCategories: () =>
    request<{
      data: Array<{
        id: string
        name: string
        slug: string
        description?: string | null
        image?: string | null
        isHidden?: boolean
        sortOrder?: number
      }>
    }>('/categories'),
  getCategoryBySlug: (slug: string) =>
    request<{
      data: {
        id: string
        name: string
        slug: string
        description?: string | null
        image?: string | null
      }
    }>(`/categories/slug/${slug}`),

  register: async (body: RegisterBody) => {

    const { firstName, lastName } = splitName(body.fullName)

    const res = await request<{ data: ApiAuthData | { requiresVerification: boolean; email: string } }>('/auth/register', {

      method: 'POST',

      body: JSON.stringify({

        email: body.email,

        password: body.password,

        firstName,

        lastName,

        phone: body.phone,

      }),

    })

    if ('requiresVerification' in res.data && res.data.requiresVerification) {
      return {
        data: {
          requiresVerification: true as const,
          email: res.data.email,
          emailSent: (res.data as { emailSent?: boolean }).emailSent !== false,
        },
      }
    }

    return { data: mapAuth(res.data as ApiAuthData) }

  },

  verifyEmail: async (body: { email: string; code: string }) => {

    const res = await request<{ data: ApiAuthData }>('/auth/verify-email', {

      method: 'POST',

      body: JSON.stringify(body),

    })

    return { data: mapAuth(res.data) }

  },

  resendVerification: (email: string) =>

    request<{ message: string }>('/auth/resend-verification', {

      method: 'POST',

      body: JSON.stringify({ email }),

    }),

  forgotPassword: (email: string) =>
    request<{ message: string; data?: { message: string } }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (body: { email: string; token: string; password: string }) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: async (body: LoginBody) => {

    const res = await request<{ data: ApiAuthData }>('/auth/login', {

      method: 'POST',

      body: JSON.stringify(body),

    })

    return { data: mapAuth(res.data) }

  },

  logout: (refreshToken: string) =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  getCart: async (opts?: { silent?: boolean }) => {
    const res = await request<{ data: ApiCart }>('/cart', { silent: opts?.silent })
    return { data: mapCart(res.data) }
  },

  addToCart: async (productId: string, quantity = 1) => {

    const res = await request<{ data: ApiCart }>('/cart/items', {

      method: 'POST',

      body: JSON.stringify({ productId, quantity }),

    })

    return { data: mapCart(res.data) }

  },

  updateCartItem: async (itemId: string, quantity: number) => {

    const res = await request<{ data: ApiCart }>(`/cart/items/${itemId}`, {

      method: 'PATCH',

      body: JSON.stringify({ quantity }),

    })

    return { data: mapCart(res.data) }

  },

  removeCartItem: async (itemId: string) => {

    const res = await request<{ data: ApiCart }>(`/cart/items/${itemId}`, { method: 'DELETE' })

    return { data: mapCart(res.data) }

  },

  checkout: (body: CheckoutBody) =>

    request<{ data: ApiOrderRaw }>('/orders', {

      method: 'POST',

      body: JSON.stringify(mapCheckoutBody(body)),

    }),

  getOrders: async () => {

    const res = await request<{ data: ApiOrderRaw[] }>('/orders')

    return { data: res.data.map(mapOrder) }

  },

  getOrder: async (id: string) => {

    const res = await request<{ data: ApiOrderRaw }>(`/orders/${id}`)

    return { data: mapOrder(res.data) }

  },

  getWishlist: (opts?: { silent?: boolean }) =>
    request<{ data: LikedItem[] }>('/wishlist', { silent: opts?.silent }),

  getWishlistIds: (opts?: { silent?: boolean }) =>
    request<{ data: string[] }>('/wishlist/ids', { silent: opts?.silent }),

  toggleWishlist: (productId: string) =>
    request<{ data: { liked: boolean; productId: string } }>(`/wishlist/${productId}/toggle`, {
      method: 'POST',
    }),

  getReviews: (productId: string) =>

    request<{ data: ReviewsResponse }>(`/public/products/${productId}/reviews`),

  submitReview: (productId: string, body: ReviewBody) =>

    request<{ data: { id: string } }>(`/public/products/${productId}/reviews`, {

      method: 'POST',

      body: JSON.stringify(body),

    }),

  getWheelPrizes: (opts?: { silent?: boolean }) =>
    request<{ data: WheelPrize[] }>('/wheel/prizes', { silent: opts?.silent }),

  getWheelStatus: (opts?: { silent?: boolean }) =>
    request<{ data: WheelStatus }>('/wheel/status', { silent: opts?.silent }),

  spinWheel: () =>
    request<{ data: WheelSpinResult }>('/wheel/spin', { method: 'POST' }),

  claimWheel: (spinId?: string, opts?: { silent?: boolean }) =>
    request<{ data: WheelSpinResult }>('/wheel/claim', {
      method: 'POST',
      body: JSON.stringify({ spinId }),
      silent: opts?.silent,
    }),

  validateCoupon: (code: string, subtotal: number, shipping = 0) =>
    request<{ data: CouponValidation }>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal, shipping }),
    }),

}



export interface CartItem {

  id: string

  product_id: string

  quantity: number

  name: string

  price: string | number

  sale_price?: string | number | null

  stock: number

  image?: string

}



export interface CartResponse {

  id: string

  items: CartItem[]

}



export interface AuthResponse {
  token: string
  refreshToken?: string
  customer: { id: string; email: string; full_name?: string; phone?: string }
}

export { clearSession, getAccessToken, getRefreshToken, hasStoredSession, getSavedCustomer, saveCustomer, setOnSessionExpired, refreshSession } from './authSession'

export async function tryRefreshSession() {
  return refreshSession(API_BASE, API_KEY)
}



export interface RegisterBody {

  email: string

  password: string

  fullName?: string

  phone?: string

}



export interface LoginBody {

  email: string

  password: string

}



export interface CheckoutBody {

  items: { product_id: string; quantity: number }[]

  customer_name: string

  customer_email: string

  customer_phone: string

  address_line1: string

  address_line2?: string

  city: string

  state?: string

  postal_code?: string

  country: string

  latitude?: number

  longitude?: number

  notes?: string

  payment_method: 'cod'

  coupon_code?: string

}



export interface WheelPrize {

  id: string

  name: string

  type: string

  value: number | null

  sortOrder: number

}



export interface WheelSpinResult {

  spinId: string

  segmentIndex: number

  prize: { id: string; name: string; type: string; value: number | null } | null

  couponCode: string | null

  isWinner: boolean

  claimed: boolean

  requiresLogin: boolean

  alreadyUsed: boolean

}



export interface WheelStatus {

  canSpin: boolean

  hasActivePrizes: boolean

  alreadySpun: boolean

  result: WheelSpinResult | null

}



export interface CouponValidation {

  code: string

  discountType: string

  discountValue: number

  discount: number

  freeShipping: boolean

  shipping: number

  expiresAt?: string | null

}



export interface ReviewBody {

  author_name: string

  rating: number

  comment?: string

}



export interface Review {

  id: string

  author_name: string

  rating: number

  comment?: string

  created_at: string

}



export interface ReviewsResponse {

  reviews: Review[]

  averageRating: number

  reviewCount: number

}



export interface OrderItem {

  id: string

  name: string

  quantity: number

  unitPrice: number

  lineTotal: number

  image?: string

}



export interface OrderStatusStep {

  status: string

  note?: string

  createdAt: string

}



export interface OrderPromo {
  kind: 'wheel' | 'coupon'
  code: string
  benefit: string
  prizeType?: string | null
  prizeName?: string | null
  discountType?: string
  discountValue?: number | null
  discountAmount: number
  freeShipping?: boolean
  freeGift?: boolean
}

export interface Order {

  id: string

  orderNumber: string

  status: string

  paymentStatus: string

  paymentMethod: string

  total: number

  subtotal: number

  discount: number

  tax: number

  shipping: number

  promo: OrderPromo | null

  createdAt: string

  items: OrderItem[]

  statusHistory: OrderStatusStep[]

}

export interface LikedItem {
  id: string
  productId: string
  createdAt: string
  product: {
    id: string
    name: string
    slug: string
    price: string | number
    salePrice?: string | number | null
    likeCount: number
    image?: string
  }
}


