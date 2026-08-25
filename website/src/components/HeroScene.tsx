import { lazy, Suspense } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import LoadingAnimation from './LoadingAnimation'

const JewelryScene = lazy(() => import('./JewelryScene'))

function SceneFallback() {
  return <LoadingAnimation className="h-full" size="lg" label={false} />
}

export default function HeroScene() {
  return (
    <ErrorBoundary fallback={<SceneFallback />}>
      <Suspense fallback={<SceneFallback />}>
        <JewelryScene />
      </Suspense>
    </ErrorBoundary>
  )
}
