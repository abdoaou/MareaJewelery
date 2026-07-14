export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
  'RETURNED',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export function statusBadgeClass(status: string) {
  switch (status) {
    case 'DELIVERED':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'SHIPPED':
    case 'PACKED':
    case 'PROCESSING':
    case 'CONFIRMED':
      return 'bg-marea-gold/15 text-marea-gold border-marea-gold/30'
    case 'CANCELLED':
    case 'REFUNDED':
    case 'RETURNED':
      return 'bg-red-500/15 text-red-400 border-red-500/30'
    default:
      return 'bg-marea-bg-soft text-marea-muted border-marea-border'
  }
}
