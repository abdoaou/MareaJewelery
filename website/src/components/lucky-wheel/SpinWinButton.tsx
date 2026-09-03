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
      className="fixed bottom-6 end-6 z-[55] flex items-center gap-2 rounded-full border border-marea-gold/50 bg-marea-bg-soft/95 px-4 py-3 text-sm font-medium text-marea-cream shadow-lg backdrop-blur transition hover:border-marea-gold hover:bg-marea-bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marea-gold"
      aria-label={t('wheel.open')}
    >
      <span aria-hidden>🎁</span>
      {t('wheel.floater')}
    </button>
  )
}
