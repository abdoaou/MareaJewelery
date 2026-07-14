import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Newsletter() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) setSubmitted(true)
  }

  return (
    <section className="relative overflow-hidden border-t border-marea-border py-24 lg:py-32">
      <div
        className="hero-glow top-0 right-0 h-[400px] w-[400px] bg-marea-gold/10"
        aria-hidden
      />

      <div className="relative mx-auto max-w-2xl px-6 text-center lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="section-label mb-4">{t('sections.newsletter.label')}</p>
          <h2 className="font-serif text-3xl font-light text-marea-cream md:text-4xl">
            {t('sections.newsletter.title')}
          </h2>

          {submitted ? (
            <p className="mt-8 text-marea-gold">{t('sections.newsletter.thanks')}</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('sections.newsletter.placeholder')}
                required
                className="flex-1 rounded-full border border-marea-border bg-marea-bg-card px-6 py-3.5 text-sm text-marea-cream placeholder:text-marea-muted outline-none transition-colors focus:border-marea-gold"
              />
              <button type="submit" className="btn-primary shrink-0">
                {t('sections.newsletter.subscribe')}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  )
}
