import { lazy, Suspense } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

const JewelryScene = lazy(() => import('./JewelryScene'))

function SceneFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <img
        src="/og-image.png"
        alt="Maréa Jewels"
        className="max-h-full max-w-full rounded-2xl object-contain opacity-90"
        width={512}
        height={512}
        decoding="async"
      />
    </div>
  )
}

interface HeroSceneProps {
  enabled: boolean
}

export default function HeroScene({ enabled }: HeroSceneProps) {
  if (!enabled) return <SceneFallback />

  return (
    <ErrorBoundary fallback={<SceneFallback />}>
      <Suspense fallback={<SceneFallback />}>
        <JewelryScene />
      </Suspense>
    </ErrorBoundary>
  )
}
