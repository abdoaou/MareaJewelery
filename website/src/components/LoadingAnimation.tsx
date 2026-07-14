import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useTranslation } from 'react-i18next'

const LOADING_SRC = '/imges/loading.lottie'

interface LoadingAnimationProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: boolean
}

const sizeClass = {
  sm: 'h-16 w-16',
  md: 'h-28 w-28',
  lg: 'h-40 w-40',
}

export default function LoadingAnimation({
  className = '',
  size = 'md',
  label = true,
}: LoadingAnimationProps) {
  const { t } = useTranslation()

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status" aria-live="polite">
      <div className={sizeClass[size]}>
        <DotLottieReact src={LOADING_SRC} loop autoplay className="h-full w-full" />
      </div>
      {label ? <p className="text-sm tracking-wide text-marea-muted">{t('common.loading')}</p> : null}
    </div>
  )
}
