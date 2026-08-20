import { useTranslation } from 'react-i18next'

interface StockBadgeProps {
  stock: number
}

export default function StockBadge({ stock }: StockBadgeProps) {
  const { t } = useTranslation()

  if (stock <= 0) {
    return <span className="sold-out-label">{t('cart.soldOut')}</span>
  }
  if (stock <= 5) {
    return (
      <span className="text-xs font-medium text-orange-400">
        {t('cart.lowStock', { count: stock })}
      </span>
    )
  }
  return <span className="text-xs text-marea-muted">{t('cart.inStock')}</span>
}
