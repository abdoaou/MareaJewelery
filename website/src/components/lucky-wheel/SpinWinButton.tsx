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
      className="wheel-floater-pulse fixed bottom-6 end-6 z-[55] flex items-center gap-2 rounded-full border border-marea-gold/60 bg-gradient-to-r from-marea-bg-soft to-marea-bg-card px-4 py-3 text-sm font-medium text-marea-cream backdrop-blur-md transition hover:border-marea-gold hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marea-gold"
      aria-label={t('wheel.open')}
    >
      <span aria-hidden>🎁</span>
      {t('wheel.floater')}
    </button>
  )
}
