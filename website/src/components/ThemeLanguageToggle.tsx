import { useTranslation } from 'react-i18next'
import { Sun, Moon, Globe } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`rounded-full p-2 text-marea-muted transition-colors hover:text-marea-gold ${className}`}
      aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export function LanguageToggle({
  className = '',
  onToggled,
  showLabel = false,
}: {
  className?: string
  onToggled?: () => void
  showLabel?: boolean
}) {
  const { t, i18n: i18nInstance } = useTranslation()

  const toggleLang = () => {
    i18nInstance.changeLanguage(i18nInstance.language === 'en' ? 'ar' : 'en')
    onToggled?.()
  }

  const label = i18nInstance.language === 'en' ? 'العربية' : 'English'

  if (showLabel) {
    return (
      <button
        type="button"
        onClick={toggleLang}
        className={`flex w-full items-center gap-3 text-sm text-marea-cream transition-colors hover:text-marea-gold ${className}`}
      >
        <Globe size={18} className="text-marea-gold" />
        <span>{t('nav.language')}</span>
        <span className="text-marea-muted">({label})</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleLang}
      className={`rounded-full p-2 text-marea-muted transition-colors hover:text-marea-gold ${className}`}
      aria-label={t('common.language')}
    >
      <Globe size={18} />
    </button>
  )
}

export default function ThemeLanguageToggle() {
  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <LanguageToggle />
    </div>
  )
}
