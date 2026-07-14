const ORDER_TYPES = new Set([
  'NEW_ORDER',
  'ORDER_CANCELLED',
  'REFUND_REQUEST',
  'ORDER_CONFIRMED',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'REFUND_APPROVED',
  'PAYMENT_FAILED',
])

const SOCKET_TYPE_MAP: Record<string, string> = {
  new_order: 'NEW_ORDER',
  order_cancelled: 'ORDER_CANCELLED',
  refund_request: 'REFUND_REQUEST',
  low_stock: 'LOW_STOCK',
  out_of_stock: 'OUT_OF_STOCK',
}

function normalizeType(type: string) {
  const key = type.toLowerCase()
  return SOCKET_TYPE_MAP[key] || type.toUpperCase()
}

/** Resolve where the admin should go when a notification is clicked */
export function getNotificationPath(
  type: string,
  data?: Record<string, unknown> | null,
): string | null {
  const t = normalizeType(type)
  const orderId = data?.orderId as string | undefined
  const productId = data?.productId as string | undefined

  if (ORDER_TYPES.has(t)) {
    return orderId ? `/orders?orderId=${orderId}` : '/orders'
  }

  if (t === 'LOW_STOCK' || t === 'OUT_OF_STOCK') {
    return productId ? `/inventory?productId=${productId}` : '/inventory'
  }

  if (t === 'NEW_USER') return '/customers'
  if (t === 'NEW_REVIEW') return '/products'

  return null
}
