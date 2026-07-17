import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Product } from '../data/products'
import { loadNewArrivalProducts } from '../utils/homeCatalog'
import ProductCard from './ProductCard'
import LoadingAnimation from './LoadingAnimation'

export default function NewArrivals() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadNewArrivalProducts()
      .then((items) => {
        if (!cancelled) setProducts(items)
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section id="new-arrivals" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 flex flex-col items-center text-center"
        >
          <p className="section-label mb-4">{t('sections.newArrivals.label')}</p>
          <h2 className="font-serif text-4xl font-light text-marea-cream md:text-5xl">
            {t('sections.newArrivals.title')}
          </h2>
          <Link to="/shop?newest=1" className="btn-secondary mt-6 text-sm">
            {t('sections.bestSellers.viewAll')}
          </Link>
        </motion.div>

        {loading ? (
          <LoadingAnimation className="py-12" />
        ) : products.length === 0 ? (
          <p className="text-center text-marea-muted">{t('shop.empty')}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, i) => (
              <motion.div
                key={product.apiProductId || product.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: Math.min(i, 5) * 0.1 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
