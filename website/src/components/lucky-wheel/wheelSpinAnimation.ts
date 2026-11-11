export const WHEEL_SPIN_MS = 5200
export const WHEEL_EXTRA_TURNS = 6

/** Ease-out quart: 1 - (1 - t)^4 */
export function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4
}

/**
 * Land the winning segment under the top pointer, with optional jitter inside the wedge.
 */
export function computeWheelTargetRotation(
  currentRotation: number,
  segmentIndex: number,
  segmentCount: number,
  extraTurns = WHEEL_EXTRA_TURNS,
  offsetDeg = 0,
): number {
  const segmentAngle = 360 / segmentCount
  const segmentMid = segmentIndex * segmentAngle + segmentAngle / 2 + offsetDeg
  const currentMod = ((currentRotation % 360) + 360) % 360
  const delta = (360 - segmentMid - currentMod + 360) % 360
  return currentRotation + extraTurns * 360 + delta
}

/** Random offset within ~35% of half a segment (stays inside wedge). */
export function randomLandingOffset(segmentCount: number): number {
  const segmentAngle = 360 / segmentCount
  const max = segmentAngle * 0.35
  return (Math.random() - 0.5) * 2 * max
}

export function animateWheelRotation(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (deg: number) => void,
  onComplete: () => void,
  reducedMotion: boolean,
): () => void {
  const duration = reducedMotion ? 450 : durationMs
  const start = performance.now()
  let raf = 0

  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = easeOutQuart(t)
    onUpdate(from + (to - from) * eased)
    if (t < 1) {
      raf = requestAnimationFrame(tick)
    } else {
      onComplete()
    }
  }

  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
