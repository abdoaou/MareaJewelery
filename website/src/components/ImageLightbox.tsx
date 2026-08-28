import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ImageLightboxProps {
  open: boolean
  onClose: () => void
  images: string[]
  index: number
  onIndexChange: (index: number) => void
  alt: string
}

export default function ImageLightbox({
  open,
  onClose,
  images,
  index,
  onIndexChange,
  alt,
}: ImageLightboxProps) {
  const { t } = useTranslation()
  const src = images[index]
  const hasMultiple = images.length > 1

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasMultiple) {
        onIndexChange((index - 1 + images.length) % images.length)
      }
      if (e.key === 'ArrowRight' && hasMultiple) {
        onIndexChange((index + 1) % images.length)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, index, images.length, hasMultiple, onIndexChange])

  return (
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm md:p-8"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t('product.enlargedImage')}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 end-4 z-10 rounded-full border border-white/20 bg-black/50 p-2 text-white transition hover:bg-black/70"
            aria-label={t('product.closeLightbox')}
          >
            <X size={22} />
          </button>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onIndexChange((index - 1 + images.length) % images.length)
                }}
                className="absolute start-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white transition hover:bg-black/70 md:start-6"
                aria-label={t('product.prevImage')}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onIndexChange((index + 1) % images.length)
                }}
                className="absolute end-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white transition hover:bg-black/70 md:end-6"
                aria-label={t('product.nextImage')}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <motion.img
            key={src}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[min(100%,56rem)] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {hasMultiple && (
            <p className="absolute bottom-4 start-1/2 -translate-x-1/2 text-sm text-white/70">
              {index + 1} / {images.length}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
