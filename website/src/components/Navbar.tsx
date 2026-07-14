import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ShoppingBag, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '../store/cartStore'
import { useWishlistStore } from '../store/wishlistStore'
import { useAuth } from '../context/AuthContext'
import ThemeLanguageToggle, { LanguageToggle, ThemeToggle } from './ThemeLanguageToggle'

export default function Navbar() {
  const { t } = useTranslation()
  const { customer, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const apiItems = useCartStore((s) => s.apiItems)
  const cartCount = apiItems.reduce((sum, i) => sum + i.quantity, 0)
  const likedIds = useWishlistStore((s) => s.likedIds)
  const likeCount = customer ? likedIds.length : 0

  const navLinks = [
    { label: t('nav.shop'), href: '/shop' },
    { label: t('nav.bestSellers'), href: '/shop?bestSeller=1' },
    { label: t('nav.story'), href: '/#promise' },
    { label: t('nav.care'), href: '/#care' },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-marea-bg/90 backdrop-blur-xl border-b border-marea-border'
          : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
        <Link to="/" className="font-serif text-2xl font-semibold tracking-[0.3em] text-marea-cream">
          MAREA
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              {link.href.startsWith('/#') ? (
                <a
                  href={link.href}
                  className="text-sm tracking-wide text-marea-cream/80 transition-colors hover:text-marea-gold"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  to={link.href}
                  className="text-sm tracking-wide text-marea-cream/80 transition-colors hover:text-marea-gold"
                >
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeLanguageToggle />
          <Link to="/likes" className="relative rounded-full p-2 text-marea-cream hover:text-marea-gold">
            <Heart size={20} />
            {likeCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-marea-gold text-[10px] text-marea-bg">
                {likeCount}
              </span>
            )}
          </Link>
          <Link to="/cart" className="relative rounded-full p-2 text-marea-cream hover:text-marea-gold">
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-marea-gold text-[10px] text-marea-bg">
                {cartCount}
              </span>
            )}
          </Link>
          {customer ? (
            <button type="button" onClick={logout} className="text-sm text-marea-muted hover:text-marea-gold">
              {t('nav.logout')}
            </button>
          ) : (
            <Link to="/login" className="text-sm text-marea-muted hover:text-marea-gold">
              {t('nav.login')}
            </Link>
          )}
          {customer && (
            <Link to="/order-tracker" className="text-sm text-marea-muted hover:text-marea-gold">
              {t('nav.orders')}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <Link to="/likes" className="relative rounded-full p-2 text-marea-cream hover:text-marea-gold">
            <Heart size={20} />
            {likeCount > 0 && (
              <span className="absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-marea-gold text-[10px] text-marea-bg">
                {likeCount}
              </span>
            )}
          </Link>
          <Link to="/cart" className="relative rounded-full p-2 text-marea-cream hover:text-marea-gold">
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-marea-gold text-[10px] text-marea-bg">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="rounded-full p-2 text-marea-cream"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t('common.toggleMenu')}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-marea-border bg-marea-bg/95 backdrop-blur-xl md:hidden"
          >
            <ul className="flex flex-col gap-4 px-6 py-6">
              {navLinks.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith('/#') ? (
                    <a href={link.href} className="block text-sm" onClick={() => setMobileOpen(false)}>
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.href} className="block text-sm" onClick={() => setMobileOpen(false)}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
              <li>
                <Link to="/likes" className="block text-sm" onClick={() => setMobileOpen(false)}>
                  {t('nav.likes')}
                  {likeCount > 0 ? ` (${likeCount})` : ''}
                </Link>
              </li>
              <li>
                <Link to="/cart" className="block text-sm" onClick={() => setMobileOpen(false)}>
                  {t('nav.cart')}
                  {cartCount > 0 ? ` (${cartCount})` : ''}
                </Link>
              </li>
              {customer && (
                <li>
                  <Link to="/order-tracker" className="block text-sm" onClick={() => setMobileOpen(false)}>
                    {t('nav.orders')}
                  </Link>
                </li>
              )}
              <li className="border-t border-marea-border pt-4">
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  <span className="text-sm text-marea-muted">{t('nav.theme')}</span>
                </div>
              </li>
              <li>
                <LanguageToggle showLabel onToggled={() => setMobileOpen(false)} />
              </li>
              <li className="border-t border-marea-border pt-4">
                {customer ? (
                  <button
                    type="button"
                    className="block text-sm text-marea-muted hover:text-marea-gold"
                    onClick={() => {
                      logout()
                      setMobileOpen(false)
                    }}
                  >
                    {t('nav.logout')}
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link
                      to="/login"
                      className="block text-sm text-marea-gold"
                      onClick={() => setMobileOpen(false)}
                    >
                      {t('nav.login')}
                    </Link>
                    <Link
                      to="/register"
                      className="block text-sm text-marea-muted hover:text-marea-gold"
                      onClick={() => setMobileOpen(false)}
                    >
                      {t('nav.register')}
                    </Link>
                  </div>
                )}
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
