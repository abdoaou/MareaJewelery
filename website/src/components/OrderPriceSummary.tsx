import { useTranslation } from 'react-i18next'
import { Gift, Sparkles, Truck } from 'lucide-react'
import { formatPrice } from '../utils/formatPrice'
import type { Order } from '../services/api'

export default function OrderPriceSummary({ order }: { order: Order }) {
  const { t } = useTranslation()
  const promo = order.promo
  const hasDiscount = order.discount > 0
  const showFreeShipping = promo?.freeShipping && !hasDiscount
  const showFreeGift = promo?.freeGift

  return (
    <div className="mt-6 space-y-3 rounded-xl border border-marea-border bg-marea-bg-card p-5">
      <h2 className="font-serif text-lg text-marea-cream">{t('orderTracker.priceSummary')}</h2>

      {promo && (
        <div className="flex items-start gap-3 rounded-lg border border-marea-gold/30 bg-marea-gold/10 px-4 py-3">
          {promo.kind === 'wheel' ? (
            <Sparkles size={18} className="mt-0.5 shrink-0 text-marea-gold" />
          ) : (
            <Gift size={18} className="mt-0.5 shrink-0 text-marea-gold" />
          )}
          <div className="min-w-0">
            <p className="text-xs tracking-wide text-marea-gold uppercase">
              {promo.kind === 'wheel' ? t('orderTracker.wheelPrize') : t('orderTracker.couponUsed')}
            </p>
            <p className="mt-0.5 font-medium text-marea-cream">{promo.benefit}</p>
            <p className="mt-1 font-mono text-xs text-marea-muted">{promo.code}</p>
          </div>
        </div>
      )}

      <div className="space-y-2 border-t border-marea-border pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-marea-muted">{t('checkout.subtotal')}</span>
          <span className="price-en text-marea-cream">{formatPrice(order.subtotal)}</span>
        </div>

        {hasDiscount && (
          <div className="flex justify-between text-marea-gold">
            <span>{t('checkout.discount')}</span>
            <span className="price-en">−{formatPrice(order.discount)}</span>
          </div>
        )}

        {showFreeShipping && (
          <div className="flex justify-between text-marea-gold">
            <span className="flex items-center gap-1.5">
              <Truck size={14} />
              {t('orderTracker.freeShipping')}
            </span>
            <span className="price-en">{t('orderTracker.included')}</span>
          </div>
        )}

        {showFreeGift && (
          <div className="flex justify-between text-marea-gold">
            <span className="flex items-center gap-1.5">
              <Gift size={14} />
              {t('orderTracker.freeGift')}
            </span>
            <span className="price-en">{t('orderTracker.included')}</span>
          </div>
        )}

        {order.shipping > 0 && (
          <div className="flex justify-between">
            <span className="text-marea-muted">{t('orderTracker.shipping')}</span>
            <span className="price-en text-marea-cream">{formatPrice(order.shipping)}</span>
          </div>
        )}

        {order.tax > 0 && (
          <div className="flex justify-between">
            <span className="text-marea-muted">{t('orderTracker.tax')}</span>
            <span className="price-en text-marea-cream">{formatPrice(order.tax)}</span>
          </div>
        )}

        <div className="flex justify-between border-t border-marea-border pt-3 text-base font-medium">
          <span className="text-marea-cream">{t('orderTracker.totalPaid')}</span>
          <span className="price-en text-marea-gold">{formatPrice(order.total)}</span>
        </div>

        {hasDiscount && order.subtotal > order.total && (
          <p className="text-xs text-marea-muted">
            {t('orderTracker.youSaved', { amount: formatPrice(order.discount) })}
          </p>
        )}
      </div>
    </div>
  )
}
