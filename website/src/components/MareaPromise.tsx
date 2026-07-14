import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function MareaPromise() {
  const { t } = useTranslation()

  return (
    <section id="promise" className="relative overflow-hidden py-32 lg:py-40">
      <div
        className="hero-glow top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 bg-marea-gold/8"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-label mb-6"
        >
          {t('sections.promise.label')}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-serif text-4xl leading-tight font-light text-marea-cream md:text-5xl lg:text-6xl"
        >
          {t('sections.promise.title')}{' '}
          <span className="gold-gradient-text italic">{t('sections.promise.titleHighlight')}</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-marea-muted"
        >
          {t('sections.promise.body')}
        </motion.p>
      </div>
    </section>
  )
}
