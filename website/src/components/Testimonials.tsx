import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { testimonialKeys } from '../data/products'

export default function Testimonials() {
  const { t } = useTranslation()

  return (
    <section className="bg-marea-bg-soft py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 flex flex-col items-center text-center"
        >
          <p className="section-label mb-4">{t('sections.testimonials.label')}</p>
          <h2 className="font-serif text-4xl font-light text-marea-cream md:text-5xl">
            {t('sections.testimonials.title')}
          </h2>
          <a
            href="https://instagram.com/marea.jewelryyy"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-marea-gold transition-colors hover:text-marea-gold-light"
          >
            {t('sections.testimonials.handle')}
          </a>
        </motion.div>

        <motion.blockquote
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <p className="font-serif text-2xl italic text-marea-cream/90 md:text-3xl">
            &ldquo;{t('sections.testimonials.tagline')}&rdquo;
          </p>
        </motion.blockquote>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonialKeys.map((key, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-marea-border bg-marea-bg-card p-8"
            >
              <div className="mb-4 flex gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} size={14} className="fill-marea-gold text-marea-gold" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-marea-muted">
                {t(`testimonials.${key}.quote`)}
              </p>
              <p className="mt-6 font-serif text-marea-cream">{t(`testimonials.${key}.author`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
