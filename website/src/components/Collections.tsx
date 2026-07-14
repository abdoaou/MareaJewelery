import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { collections as fallbackCollections } from '../data/products'
import { loadCategories } from '../utils/homeCatalog'

const MAX_VISIBLE = 5

type CollectionCard = {
  id: string
  slug: string
  title: string
  description: string
  image: string
}

export default function Collections() {
  const { t } = useTranslation()
  const [items, setItems] = useState<CollectionCard[]>(
    fallbackCollections.map((c) => ({
      id: c.id,
      slug: c.id,
      title: t(`collections.${c.id}.title`, c.id),
      description: t(`collections.${c.id}.description`, ''),
      image: c.image,
    })),
  )
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadCategories()
      .then((rows) => {
        const fromApi = rows
          .filter((c) => !c.isHidden && c.image)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((c) => ({
            id: c.id,
            slug: c.slug,
            title: c.name,
            description: c.description || '',
            image: c.image as string,
          }))
        if (fromApi.length) setItems(fromApi)
      })
      .catch(() => {})
  }, [])

  const visible = showAll ? items : items.slice(0, MAX_VISIBLE)
  const hasMore = items.length > MAX_VISIBLE

  return (
    <section id="collections" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <p className="section-label mb-4">{t('sections.collections.label')}</p>
          <h2 className="font-serif text-4xl font-light text-marea-cream md:text-5xl lg:text-6xl">
            {t('sections.collections.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-marea-muted">
            {t('sections.collections.subtitle')}
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: Math.min(i, 4) * 0.1 }}
              className={i === 0 ? 'sm:col-span-2 lg:row-span-1' : ''}
            >
              <Link to={`/category/${item.slug}`} className="card-luxury group block cursor-pointer">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="card-luxury-overlay absolute inset-0" />
                  <div className="card-luxury-fab absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-marea-border opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                    <ArrowUpRight size={18} className="text-marea-gold" />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-2xl font-medium text-marea-cream">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-marea-muted">{item.description}</p>
                  ) : null}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {hasMore && !showAll && (
          <div className="mt-12 flex justify-center">
            <button type="button" className="btn-secondary text-sm" onClick={() => setShowAll(true)}>
              {t('sections.collections.viewMore')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
