import { lazy, Suspense } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

const JewelryScene = lazy(() => import('./JewelryScene'))

function SceneFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <img
        src="https://images.unsplash.com/photo-1611591436351-5b4c4e6e7c3a?w=600"
        alt="Marea jewelry"
        className="max-h-full max-w-full rounded-2xl object-cover opacity-90"
      />
    </div>
  )
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
