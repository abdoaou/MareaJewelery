import { motion } from 'framer-motion'
import { Sparkles, Gem, Gift } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { whyChooseKeys } from '../data/products'

const icons = [Sparkles, Gem, Gift]

export default function WhyChoose() {
  const { t } = useTranslation()

  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="section-label mb-4">{t('sections.whyChoose.label')}</p>
          <h2 className="font-serif text-4xl font-light text-marea-cream md:text-5xl">
            {t('sections.whyChoose.title')}
          </h2>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {whyChooseKeys.map((key, i) => {
            const Icon = icons[i]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="rounded-2xl border border-marea-border bg-marea-bg-card p-8 text-center"
              >
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-marea-border bg-marea-bg-soft">
                  <Icon size={24} className="text-marea-gold" />
                </div>
                <h3 className="font-serif text-xl font-medium text-marea-cream">
                  {t(`whyChooseItems.${key}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-marea-muted">
                  {t(`whyChooseItems.${key}.description`)}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
