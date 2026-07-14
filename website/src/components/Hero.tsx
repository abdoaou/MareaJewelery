import { motion } from 'framer-motion'
import { ArrowRight, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HeroScene from './HeroScene'

export default function Hero() {
  const { t } = useTranslation()

  const stats = [
    { value: t('hero.stat1Value'), label: t('hero.stat1Label') },
    { value: t('hero.stat2Value'), label: t('hero.stat2Label') },
  ]

  return (
    <section className="relative min-h-screen overflow-hidden pt-24">
      <div
        className="hero-glow top-1/4 left-1/4 h-[500px] w-[500px] bg-marea-gold/10"
        aria-hidden
      />
      <div
        className="hero-glow bottom-0 right-0 h-[400px] w-[400px] bg-marea-gold/5"
        aria-hidden
      />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
        <motion.div
          initial={{ opacity: 1, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="order-2 lg:order-1"
        >
          <p className="section-label mb-6">{t('hero.label')}</p>

          <h1 className="font-serif text-5xl leading-[1.1] font-light text-marea-cream md:text-6xl lg:text-7xl">
            {t('hero.title')}{' '}
            <span className="gold-gradient-text italic">{t('hero.titleHighlight')}</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-marea-muted md:text-lg">
            {t('hero.subtitle')}
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/shop" className="btn-primary">
              {t('hero.shopCollection')}
              <ArrowRight size={16} />
            </Link>
            <a href="#new-arrivals" className="btn-secondary">
              {t('hero.newArrivals')}
            </a>
          </div>

          <div className="mt-14 flex flex-wrap gap-10 border-t border-marea-border pt-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="price-en font-serif text-2xl font-medium text-marea-gold">{stat.value}</p>
                <p className="mt-1 text-sm text-marea-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative order-1 h-[420px] lg:order-2 lg:h-[600px]"
        >
          <HeroScene />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-marea-border bg-marea-bg/60 px-5 py-2.5 text-xs tracking-widest text-marea-gold-light backdrop-blur-md uppercase"
          >
            <Star size={12} className="me-2 inline text-marea-gold" />
            {t('hero.dragToRotate')}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
