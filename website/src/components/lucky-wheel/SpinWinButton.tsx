import { useTranslation } from 'react-i18next'

interface SpinWinButtonProps {
  onClick: () => void
}

export default function SpinWinButton({ onClick }: SpinWinButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className="wheel-floater wheel-floater-pulse fixed z-[55] flex items-center gap-1.5 rounded-full border border-marea-gold/60 bg-gradient-to-r from-marea-bg-soft to-marea-bg-card font-medium text-marea-cream backdrop-blur-md transition hover:border-marea-gold hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marea-gold"
      aria-label={t('wheel.open')}
    >
      <span className="text-base sm:text-lg" aria-hidden>
        🎁
      </span>
      <span className="hidden text-xs sm:inline sm:text-sm">{t('wheel.floater')}</span>
      <span className="text-xs sm:hidden">{t('wheel.floaterShort')}</span>
    </button>
  )
}
