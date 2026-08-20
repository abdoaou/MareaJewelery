import { useTranslation } from 'react-i18next'

export default function SoldOutOverlay() {
  const { t } = useTranslation()

  return (
    <div className="sold-out-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="sold-out-badge">
        <span aria-hidden className="sold-out-badge-accent" />
        <span className="sold-out-badge-text">{t('cart.soldOut')}</span>
        <span aria-hidden className="sold-out-badge-accent" />
      </div>
    </div>
  )
}
