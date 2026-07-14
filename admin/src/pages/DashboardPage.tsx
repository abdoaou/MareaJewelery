import { useEffect, useState } from 'react'
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  Eye,
  Heart,
  MessageSquare,
} from 'lucide-react'
import { dashboardApi } from '../services/api'
import type { DashboardStats } from '../types'
import { StatCard } from '../components/ui/StatCard'
import { Skeleton } from '../components/ui/EmptyState'
import { DashboardCharts } from '../components/charts/DashboardCharts'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [charts, setCharts] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([dashboardApi.stats(), dashboardApi.charts()])
      .then(([s, c]) => {
        setStats(s.data)
        setCharts(c.data)
      })
      .finally(() => setLoading(false))

    const interval = setInterval(() => {
      dashboardApi.stats().then((s) => setStats(s.data))
      dashboardApi.charts().then((c) => setCharts(c.data))
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-muted">Live store performance overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Total Revenue" value={fmt(stats.revenue.total)} icon={DollarSign} accent />
        <StatCard label="Today's Revenue" value={fmt(stats.revenue.today)} icon={TrendingUp} />
        <StatCard label="Yesterday" value={fmt(stats.revenue.yesterday)} icon={DollarSign} />
        <StatCard label="Last 7 Days" value={fmt(stats.revenue.last7Days)} icon={DollarSign} />
        <StatCard label="Last 30 Days" value={fmt(stats.revenue.last30Days)} icon={DollarSign} />
        <StatCard label="Total Orders" value={stats.orders.total} icon={ShoppingCart} />
        <StatCard label="Orders Today" value={stats.orders.today} icon={ShoppingCart} />
        <StatCard label="Pending" value={stats.orders.pending} icon={AlertTriangle} />
        <StatCard label="Processing" value={stats.orders.processing} icon={ShoppingCart} />
        <StatCard label="Delivered" value={stats.orders.delivered} icon={ShoppingCart} />
        <StatCard label="Cancelled" value={stats.orders.cancelled} icon={ShoppingCart} />
        <StatCard label="Total Products" value={stats.products.total} icon={Package} />
        <StatCard label="Active Products" value={stats.products.active} icon={Package} />
        <StatCard label="Out of Stock" value={stats.products.outOfStock} icon={AlertTriangle} />
        <StatCard label="Low Stock" value={stats.products.lowStock} icon={AlertTriangle} />
        <StatCard label="Categories" value={stats.categories.total} icon={Package} />
        <StatCard label="Customers" value={stats.customers.total} icon={Users} />
        <StatCard label="New Today" value={stats.customers.newToday} icon={Users} />
        <StatCard label="Visitors Today" value={stats.visitors.today} icon={Eye} />
        <StatCard label="Visitors / Week" value={stats.visitors.thisWeek} icon={Eye} />
        <StatCard label="Total Likes" value={stats.engagement.totalLikes} icon={Heart} />
        <StatCard label="Reviews" value={stats.engagement.totalReviews} icon={MessageSquare} />
        <StatCard label="Questions" value={stats.engagement.totalQuestions} icon={MessageSquare} />
        <StatCard label="Avg Order Value" value={fmt(stats.engagement.averageOrderValue)} icon={DollarSign} accent />
        <StatCard label="Inventory Value" value={fmt(stats.inventory.value)} icon={Package} />
      </div>

      <DashboardCharts data={charts} />
    </div>
  )
}
