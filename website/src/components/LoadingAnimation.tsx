import { useTranslation } from 'react-i18next'

interface LoadingAnimationProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: boolean
}

const sizeClass = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
}

export default function LoadingAnimation({
  className = '',
  size = 'md',
  label = true,
}: LoadingAnimationProps) {
  const { t } = useTranslation()

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className={`loading-spinner ${sizeClass[size]}`} aria-hidden />
      {label ? <p className="text-sm tracking-wide text-marea-muted">{t('common.loading')}</p> : null}
    </div>
  )
}
