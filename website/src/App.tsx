import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ProductCatalogProvider } from './context/ProductCatalogContext'
import { LuckyWheelProvider } from './components/lucky-wheel/LuckyWheelProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ScrollToTop from './components/ScrollToTop'
import VisitTracker from './components/VisitTracker'
import LoadingAnimation from './components/LoadingAnimation'

const ShopPage = lazy(() => import('./pages/ShopPage'))
const ProductDetailsPage = lazy(() => import('./pages/ProductDetailsPage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const OrderTrackerPage = lazy(() => import('./pages/OrderTrackerPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const LikesPage = lazy(() => import('./pages/LikesPage'))

function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ProductCatalogProvider>
              <BrowserRouter>
              <ScrollToTop />
              <VisitTracker />
              <LuckyWheelProvider>
              <div className="min-h-screen bg-marea-bg text-marea-cream">
                <Navbar />
                <main>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingAnimation className="py-24" />}>
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/shop" element={<ShopPage />} />
                        <Route path="/product/:slug" element={<ProductDetailsPage />} />
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
                    </Suspense>
                  </ErrorBoundary>
                </main>
                <Footer />
              </div>
              </LuckyWheelProvider>
            </BrowserRouter>
          </ProductCatalogProvider>
        </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LazyMotion>
  )
}

export default App
