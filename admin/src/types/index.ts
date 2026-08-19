export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  meta?: { total: number; page: number; limit: number; totalPages?: number }
}

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  role: string
  status: string
}

export interface DashboardStats {
  revenue: Record<string, number>
  orders: Record<string, number>
  products: Record<string, number>
  categories: { total: number }
  customers: { total: number; newToday: number }
  engagement: {
    totalLikes: number
    totalReviews: number
    totalQuestions: number
    totalViews: number
    averageOrderValue: number
  }
  visitors: { today: number; thisWeek: number; thisMonth: number }
  inventory: { value: number }
}

export interface Product {
  id: string
  name: string
  slug: string
  sku?: string
  status: string
  price: string | number
  salePrice?: string | number
  viewCount: number
  likeCount: number
  category?: { id: string; name: string }
  brand?: { id: string; name: string }
  images?: { id: string; url: string; isPrimary: boolean }[]
  inventory?: { currentStock: number; reservedStock: number }[]
  _count?: { orderItems: number }
  description?: string
  tags?: string[]
  isFeatured?: boolean
  isBestSeller?: boolean
  isNewArrival?: boolean
  createdAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  parentId?: string
  parent?: { name: string }
  sortOrder: number
  isFeatured: boolean
  isHidden: boolean
  _count?: { products: number }
}

export interface Order {
  id: string
  orderNumber: string
  status: string
  paymentMethod: string
  paymentStatus: string
  total: string | number
  subtotal: string | number
  createdAt: string
  shippingAddress?: { city?: string; line1?: string; country?: string; phone?: string; name?: string }
  customerNotes?: string
  adminNotes?: string
  user?: { email: string; firstName?: string; lastName?: string; phone?: string }
  items?: OrderItem[]
  statusHistory?: { status: string; note?: string; createdAt: string }[]
  payments?: { method: string; status: string; amount: string | number }[]
}

export interface OrderItem {
  id: string
  productId?: string
  productName: string
  sku?: string
  quantity: number
  unitPrice: string | number
  lineTotal: string | number
  product?: {
    id: string
    slug?: string
    images?: { url: string; isPrimary?: boolean }[]
  }
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  data?: Record<string, unknown>
}

export interface InventoryRow {
  id: string
  currentStock: number
  reservedStock: number
  incomingStock: number
  lowStockThreshold: number
  product: { id: string; name: string; sku?: string; price: string | number }
  warehouse: { name: string; code: string }
}
