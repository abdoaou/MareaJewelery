import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { faqKeys } from '../data/products'

export default function JewelryCare() {
  const { t } = useTranslation()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="care" className="py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="section-label mb-4">{t('sections.care.label')}</p>
          <h2 className="font-serif text-4xl font-light text-marea-cream md:text-5xl">
            {t('sections.care.title')}
          </h2>
          <p className="mt-4 text-marea-muted">{t('sections.care.subtitle')}</p>
        </motion.div>

        <div className="space-y-3">
          {faqKeys.map((key, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="overflow-hidden rounded-xl border border-marea-border bg-marea-bg-card"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-6 py-5 text-start"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
              >
                <span className="font-serif text-lg text-marea-cream">
                  {t(`faqs.${key}.question`)}
                </span>
                <ChevronDown
                  size={20}
                  className={`shrink-0 text-marea-gold transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="border-t border-marea-border px-6 py-4 text-sm leading-relaxed text-marea-muted">
                      {t(`faqs.${key}.answer`)}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
