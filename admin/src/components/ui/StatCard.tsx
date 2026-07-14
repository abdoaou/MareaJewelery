import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: string
  accent?: boolean
}

export function StatCard({ label, value, icon: Icon, trend, accent }: StatCardProps) {
  return (
    <div className={clsx('card stat-animate', accent && 'border-gold/30')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted sm:text-xs">{label}</p>
          <p className="mt-1.5 truncate text-lg font-semibold tabular-nums sm:mt-2 sm:text-2xl">{value}</p>
          {trend && <p className="mt-1 text-xs text-gold">{trend}</p>}
        </div>
        <div className="shrink-0 rounded-lg bg-gold/10 p-1.5 text-gold sm:p-2">
          <Icon size={16} />
        </div>
      </div>
    </div>
  )
}
