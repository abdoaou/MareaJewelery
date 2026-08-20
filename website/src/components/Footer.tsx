import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { loadCategories } from '../utils/homeCatalog'

const differenceItemKeys = ['0', '1', '2', '3'] as const

type FooterCategory = { id: string; slug: string; name: string }

export default function Footer() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<FooterCategory[]>([])

  const supportLinks = [
    { label: t('footer.jewelryCare'), href: '#care' },
    { label: t('footer.faq'), href: '#care' },
    { label: t('footer.instagram'), href: 'https://instagram.com/marea.jewelryyy' },
  ]

  useEffect(() => {
    loadCategories()
      .then((rows) =>
        setCategories(
          rows
            .filter((c) => !c.isHidden)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
        ),
      )
      .catch(() => setCategories([]))
  }, [])

  return (
    <footer className="border-t border-marea-border bg-marea-bg-soft py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="font-serif text-2xl font-semibold tracking-[0.3em] text-marea-cream">
              MAREA
            </p>
            <p className="section-label mt-6 mb-3">{t('footer.differenceLabel')}</p>
            <p className="max-w-md text-sm leading-relaxed text-marea-muted">
              {t('footer.differenceBody')}
            </p>
            <ul className="mt-5 space-y-2.5">
              {differenceItemKeys.map((key) => (
                <li key={key} className="flex items-start gap-3 text-sm text-marea-cream/90">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-marea-gold" aria-hidden />
                  <span>{t(`footer.differenceItems.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="section-label mb-4">{t('footer.shop')}</p>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/shop"
                  className="text-sm text-marea-muted transition-colors hover:text-marea-gold"
                >
                  {t('shop.allProducts')}
                </Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/category/${cat.slug}`}
                    className="text-sm text-marea-muted transition-colors hover:text-marea-gold"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="section-label mb-4">{t('footer.support')}</p>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-sm text-marea-muted transition-colors hover:text-marea-gold"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-marea-border pt-8 text-center text-xs text-marea-muted">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  )
}
