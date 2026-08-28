import { useTranslation } from 'react-i18next'

interface LoadErrorProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export default function LoadError({ message, onRetry, className = 'mt-16' }: LoadErrorProps) {
  const { t } = useTranslation()

  return (
    <div
      className={`rounded-xl border border-red-400/25 bg-red-400/5 px-6 py-8 text-center ${className}`}
      role="alert"
    >
      <p className="text-sm text-red-400">{message || t('common.errorLoad')}</p>
      {onRetry && (
        <button type="button" className="btn-secondary mt-4 text-sm" onClick={onRetry}>
          {t('common.tryAgain')}
        </button>
      )}
    </div>
  )
}
