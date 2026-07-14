import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { categoryItems } from '../data/products'
import { loadCategories } from '../utils/homeCatalog'

type DisplayCategory = {
  id: string
  slug: string
  name: string
  image: string
}

export default function ShopByCategory() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<DisplayCategory[]>(
    categoryItems.map((c) => ({
      id: c.id,
      slug: c.id,
      name: t(`categories.${c.id}`, c.id),
      image: c.image,
    })),
  )

  useEffect(() => {
    loadCategories()
      .then((rows) => {
        const fromApi = rows
          .filter((c) => !c.isHidden && c.image)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            image: c.image as string,
          }))
        if (fromApi.length) setCategories(fromApi)
      })
      .catch(() => {})
  }, [])

  return (
    <section className="bg-marea-bg-soft py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <p className="section-label mb-4">{t('sections.shopByCategory.label')}</p>
          <h2 className="font-serif text-4xl font-light text-marea-cream md:text-5xl">
            {t('sections.shopByCategory.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-marea-muted">
            {t('sections.shopByCategory.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Link
                to={`/category/${cat.slug}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-2xl"
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-marea-bg/90 via-marea-bg/25 to-transparent" />
                <span className="absolute bottom-5 start-5 font-serif text-xl text-marea-cream transition-colors group-hover:text-marea-gold">
                  {cat.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
