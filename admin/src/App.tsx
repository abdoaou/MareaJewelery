import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductsPage } from './pages/ProductsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { InventoryPage } from './pages/InventoryPage'
import { CustomersPage } from './pages/CustomersPage'
import { Skeleton } from './components/ui/EmptyState'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, fetchUser } = useAuthStore()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const initTheme = useThemeStore((s) => s.init)

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="customers" element={<CustomersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
