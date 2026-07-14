import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ProductCatalogProvider } from './context/ProductCatalogContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import OrderTrackerPage from './pages/OrderTrackerPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import LikesPage from './pages/LikesPage'
import CategoryPage from './pages/CategoryPage'
import ShopPage from './pages/ShopPage'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProductCatalogProvider>
          <BrowserRouter>
          <div className="min-h-screen bg-marea-bg text-marea-cream">
            <Navbar />
            <main>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route path="/likes" element={<LikesPage />} />
                  <Route path="/order-tracker" element={<OrderTrackerPage />} />
                  <Route path="/order-tracker/:orderId" element={<OrderTrackerPage />} />
                </Routes>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
        </ProductCatalogProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
