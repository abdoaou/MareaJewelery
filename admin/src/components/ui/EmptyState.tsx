import { Inbox } from 'lucide-react'

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-white/5 p-4">
        <Inbox className="text-white/30" size={32} />
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-white/50">{description}</p>}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
}
