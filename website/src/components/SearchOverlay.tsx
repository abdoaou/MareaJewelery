import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    navigate(`/shop?search=${encodeURIComponent(trimmed)}`)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-marea-bg/80 px-6 pt-28 backdrop-blur-md md:pt-32"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="section-label mb-4 text-center">{t('search.label')}</p>
            <form onSubmit={handleSubmit} className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-marea-gold"
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search.placeholder')}
                aria-label={t('search.placeholder')}
                className="w-full rounded-full border border-marea-border bg-marea-bg-soft/90 py-4 ps-14 pe-14 font-serif text-lg text-marea-cream placeholder:text-marea-muted/70 outline-none transition focus:border-marea-gold focus:ring-2 focus:ring-marea-gold/20"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label={t('search.close')}
                className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-marea-muted transition hover:text-marea-gold"
              >
                <X size={18} />
              </button>
            </form>
            <p className="mt-4 text-center text-xs tracking-wide text-marea-muted">
              {t('search.hint')}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
