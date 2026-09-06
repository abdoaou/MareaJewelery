import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useThemeStore } from '../../store/themeStore'

const COLORS = ['#c9a962', '#8b7355', '#6b8e9f', '#9f6b8e', '#6b9f7a', '#9f8b6b']

interface ChartsProps {
  data: Record<string, unknown>
}

function useChartTheme() {
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'
  return {
    grid: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)',
    tick: isLight ? '#666666' : '#888888',
    tooltipBg: isLight ? '#ffffff' : '#1a1a1a',
    tooltipBorder: isLight ? '#dddddd' : '#333333',
  }
}

export function DashboardCharts({ data }: ChartsProps) {
  const chart = useChartTheme()
  const dailySales = (data.dailySales as { date: string; revenue: number; orders: number }[]) || []
  const orderStatus = (data.orderStatus as { status: string; count: number }[]) || []
  const topProducts = (data.topProducts as { name: string; sales: number; revenue: number }[]) || []
  const topCategories = (data.topCategories as { name: string; revenue: number }[]) || []
  const mostViewed = (data.mostViewed as { name: string; viewCount: number }[]) || []

  const dailyFormatted = dailySales.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    revenue: Number(d.revenue),
    orders: Number(d.orders),
  }))

  const tooltipStyle = { background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}` }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="card lg:col-span-2">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">Daily Sales (30 days)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dailyFormatted}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis dataKey="date" tick={{ fill: chart.tick, fontSize: 11 }} />
            <YAxis tick={{ fill: chart.tick, fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#c9a962" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="orders" stroke="#6b8e9f" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">Order Status</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={orderStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
              {orderStatus.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">Top Products</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={topProducts.slice(0, 6)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis type="number" tick={{ fill: chart.tick, fontSize: 11 }} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fill: chart.tick, fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="sales" fill="#c9a962" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">Revenue by Category</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={topCategories}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis dataKey="name" tick={{ fill: chart.tick, fontSize: 10 }} />
            <YAxis tick={{ fill: chart.tick, fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="revenue" fill="#8b7355" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">Most Viewed Products</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={mostViewed.slice(0, 6)}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis dataKey="name" tick={{ fill: chart.tick, fontSize: 10 }} />
            <YAxis tick={{ fill: chart.tick, fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="viewCount" fill="#6b8e9f" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
