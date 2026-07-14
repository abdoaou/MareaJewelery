import clsx from 'clsx'

const colors: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  CONFIRMED: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-indigo-500/20 text-indigo-400',
  PACKED: 'bg-purple-500/20 text-purple-400',
  SHIPPED: 'bg-cyan-500/20 text-cyan-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  REFUNDED: 'bg-orange-500/20 text-orange-400',
  RETURNED: 'bg-pink-500/20 text-pink-400',
  PUBLISHED: 'bg-green-500/20 text-green-400',
  DRAFT: 'bg-gray-500/20 text-gray-400',
  HIDDEN: 'bg-yellow-500/20 text-yellow-400',
  ARCHIVED: 'bg-red-500/20 text-red-400',
}

export function Badge({ status }: { status: string }) {
  return (
    <span className={clsx('badge', colors[status] || 'bg-white/10 text-white/70')}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
