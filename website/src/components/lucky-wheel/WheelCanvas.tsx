import { useMemo, type CSSProperties } from 'react'

interface WheelCanvasProps {
  prizes: Array<{ id: string; name: string; type?: string }>
  rotation: number
  spinning: boolean
  preSpinning?: boolean
  spinDurationMs?: number
  highlightIndex?: number | null
}

const SIZE = 340
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER_R = 148
const INNER_R = 48
const RIM_OUTER = OUTER_R + 10
const STUD_COUNT = 28

export const WHEEL_SPIN_MS = 5200
/** Long ease-out with a subtle overshoot at the end */
export const WHEEL_SPIN_EASING = 'cubic-bezier(0.16, 0.78, 0.12, 1)'

/** Align segment center with the top pointer from the current wheel angle. */
export function computeWheelTargetRotation(
  currentRotation: number,
  segmentIndex: number,
  segmentCount: number,
  extraTurns = 5,
): number {
  const segmentAngle = 360 / segmentCount
  const segmentMid = segmentIndex * segmentAngle + segmentAngle / 2
  const currentMod = ((currentRotation % 360) + 360) % 360
  const delta = (360 - segmentMid - currentMod + 360) % 360
  return currentRotation + extraTurns * 360 + delta
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function annularSegment(index: number, total: number) {
  const start = (360 / total) * index
  const end = (360 / total) * (index + 1)
  const large = end - start > 180 ? 1 : 0
  const o1 = polar(CX, CY, OUTER_R, start)
  const o2 = polar(CX, CY, OUTER_R, end)
  const i2 = polar(CX, CY, INNER_R, end)
  const i1 = polar(CX, CY, INNER_R, start)
  return `M ${o1.x} ${o1.y} A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${INNER_R} ${INNER_R} 0 ${large} 0 ${i1.x} ${i1.y} Z`
}

type SegmentTone = 'gold' | 'pearl' | 'onyx'

function segmentTone(index: number): SegmentTone {
  const tones: SegmentTone[] = ['gold', 'pearl', 'onyx']
  return tones[index % 3]
}

function shortLabel(name: string) {
  if (/better luck/i.test(name)) return 'Try Again'
  if (/free shipping/i.test(name)) return 'Free Ship'
  if (/free gift/i.test(name)) return 'Gift'
  const pct = name.match(/(\d+)\s*%/)
  if (pct) return `${pct[1]}% Off`
  return name.length > 12 ? `${name.slice(0, 11)}…` : name
}

function labelFill(tone: SegmentTone, winning: boolean) {
  if (winning) return '#1a1612'
  if (tone === 'onyx') return '#f3e9d2'
  if (tone === 'pearl') return '#1a1612'
  return '#1a1612'
}

export default function WheelCanvas({
  prizes,
  rotation,
  spinning,
  preSpinning = false,
  spinDurationMs = WHEEL_SPIN_MS,
  highlightIndex = null,
}: WheelCanvasProps) {
  const count = Math.max(prizes.length, 1)
  const segmentAngle = 360 / count
  const labelR = (OUTER_R + INNER_R) / 2
  const pointerActive = spinning || preSpinning

  const segments = useMemo(
    () =>
      prizes.map((prize, i) => {
        const mid = i * segmentAngle + segmentAngle / 2
        const labelPos = polar(CX, CY, labelR, mid)
        const tone = segmentTone(i)
        return { prize, i, mid, labelPos, tone, path: annularSegment(i, count) }
      }),
    [prizes, count, segmentAngle],
  )

  const studs = useMemo(() => {
    return Array.from({ length: STUD_COUNT }, (_, k) => {
      const deg = (360 / STUD_COUNT) * k
      const p = polar(CX, CY, RIM_OUTER - 1.5, deg)
      return { ...p, key: k }
    })
  }, [])

  return (
    <div className="wheel-stage mx-auto">
      <div className="wheel-glow pointer-events-none absolute inset-0 rounded-full" aria-hidden />
      <div className="wheel-sparkle-field pointer-events-none absolute inset-0" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="wheel-sparkle" style={{ '--i': i } as CSSProperties} />
        ))}
      </div>
      <div className="wheel-rim-sweep pointer-events-none absolute inset-0 rounded-full" aria-hidden />

      <div
        className={`wheel-pointer pointer-events-none absolute left-1/2 z-30 -translate-x-1/2${pointerActive ? ' wheel-pointer--active' : ''}`}
        aria-hidden
      >
        <svg
          viewBox="0 0 32 44"
          className="h-auto w-full drop-shadow-[0_4px_14px_rgba(26,22,18,0.35)]"
        >
          <defs>
            <linearGradient id="wheelPointerGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f3e9d2" />
              <stop offset="35%" stopColor="#e8d4a0" />
              <stop offset="100%" stopColor="#b8944f" />
            </linearGradient>
            <radialGradient id="wheelPointerGem" cx="50%" cy="22%" r="40%">
              <stop offset="0%" stopColor="#fffef8" />
              <stop offset="55%" stopColor="#d4b97a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#9a7b3c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path
            d="M16 2 L30 38 Q16 34 2 38 Z"
            fill="url(#wheelPointerGold)"
            stroke="#c9a962"
            strokeWidth="0.75"
            strokeOpacity="0.65"
          />
          <path d="M16 10 L22 20 L16 28 L10 20 Z" fill="url(#wheelPointerGem)" opacity="0.95" />
        </svg>
      </div>

      <div
        className={`wheel-spin relative mx-auto aspect-square w-full will-change-transform${spinning ? ' wheel-spin--active' : ''}${preSpinning ? ' wheel-spin--pre' : ''}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition:
            spinning && !preSpinning ? `transform ${spinDurationMs}ms ${WHEEL_SPIN_EASING}` : 'none',
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="wheel-svg h-full w-full" role="img" aria-label="Lucky wheel">
          <defs>
            <linearGradient id="segGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0e2c4" />
              <stop offset="28%" stopColor="#d4b97a" />
              <stop offset="55%" stopColor="#c4a86a" />
              <stop offset="82%" stopColor="#e8d4a8" />
              <stop offset="100%" stopColor="#a88945" />
            </linearGradient>
            <linearGradient id="segGoldSheen" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#fff8ec" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#d4b97a" stopOpacity="0" />
              <stop offset="100%" stopColor="#1a1612" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="segPearl" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#faf6ee" />
              <stop offset="50%" stopColor="#f3e9d2" />
              <stop offset="100%" stopColor="#e5d9c0" />
            </linearGradient>
            <linearGradient id="segOnyx" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2a2420" />
              <stop offset="45%" stopColor="#1a1612" />
              <stop offset="100%" stopColor="#12100e" />
            </linearGradient>
            <linearGradient id="rimGoldPolish" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b8944f" />
              <stop offset="25%" stopColor="#f3e9d2" />
              <stop offset="50%" stopColor="#d4b97a" />
              <stop offset="75%" stopColor="#c4a86a" />
              <stop offset="100%" stopColor="#9a7b3c" />
            </linearGradient>
            <filter id="dividerShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0.5" stdDeviation="0.4" floodColor="#1a1612" floodOpacity="0.35" />
            </filter>
            <filter id="winSegmentGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx={CX} cy={CY} r={RIM_OUTER} fill="#0e0c0a" />
          <circle
            cx={CX}
            cy={CY}
            r={RIM_OUTER}
            fill="none"
            stroke="url(#rimGoldPolish)"
            strokeWidth="5.5"
          />
          <circle
            cx={CX}
            cy={CY}
            r={OUTER_R + 3.5}
            fill="none"
            stroke="#1a1612"
            strokeWidth="2.25"
            opacity="0.92"
          />
          <circle
            cx={CX}
            cy={CY}
            r={OUTER_R + 2}
            fill="none"
            stroke="#d4b97a"
            strokeWidth="0.4"
            opacity="0.35"
          />

          {studs.map((s) => (
            <g key={s.key}>
              <circle cx={s.x} cy={s.y} r="3.2" fill="#1a1612" opacity="0.5" />
              <circle
                cx={s.x}
                cy={s.y}
                r="2.1"
                fill="#e8d4a8"
                stroke="#d4b97a"
                strokeWidth="0.4"
                className="wheel-stud"
              />
            </g>
          ))}

          {segments.map(({ prize, i, path, tone }) => {
            const isWinner = highlightIndex === i
            const fillId =
              tone === 'gold' ? 'url(#segGold)' : tone === 'pearl' ? 'url(#segPearl)' : 'url(#segOnyx)'
            return (
              <g key={prize.id} className={isWinner ? 'wheel-segment-win' : undefined}>
                <path
                  d={path}
                  fill={fillId}
                  stroke="#c9a962"
                  strokeWidth="0.65"
                  strokeOpacity={isWinner ? 0.85 : 0.4}
                  filter={isWinner ? 'url(#winSegmentGlow)' : undefined}
                />
                {tone === 'gold' && (
                  <path d={path} fill="url(#segGoldSheen)" stroke="none" pointerEvents="none" opacity="0.85" />
                )}
              </g>
            )
          })}

          {prizes.map((_, i) => {
            const a = i * segmentAngle
            const p1 = polar(CX, CY, INNER_R + 2, a)
            const p2 = polar(CX, CY, OUTER_R - 1, a)
            return (
              <line
                key={`spoke-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#c9a962"
                strokeWidth="0.75"
                strokeOpacity="0.55"
                filter="url(#dividerShadow)"
              />
            )
          })}

          {segments.map(({ prize, mid, labelPos, tone, i }) => (
            <text
              key={`label-${prize.id}`}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${mid}, ${labelPos.x}, ${labelPos.y})`}
              className={`wheel-segment-label select-none${highlightIndex === i ? ' wheel-segment-label--win' : ''}`}
              fill={labelFill(tone, highlightIndex === i)}
            >
              {shortLabel(prize.name)}
            </text>
          ))}
        </svg>
      </div>

      <div className="wheel-hub-medallion pointer-events-none absolute left-1/2 top-1/2 z-[15] -translate-x-1/2 -translate-y-1/2" aria-hidden>
        <svg viewBox="0 0 88 88" className="h-full w-full">
          <defs>
            <linearGradient id="hubGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f3e9d2" />
              <stop offset="40%" stopColor="#d4b97a" />
              <stop offset="100%" stopColor="#9a7b3c" />
            </linearGradient>
          </defs>
          <circle cx="44" cy="44" r="42" fill="#1a1612" opacity="0.12" />
          <circle
            cx="44"
            cy="44"
            r="40"
            fill="url(#hubGold)"
            stroke="#c9a962"
            strokeWidth="1.2"
          />
          <circle cx="44" cy="44" r="36" fill="none" stroke="#f3e9d2" strokeWidth="0.5" opacity="0.5" />
          <text
            x="44"
            y="48"
            textAnchor="middle"
            className="wheel-hub-monogram"
            fill="#1a1612"
          >
            M
          </text>
        </svg>
      </div>
    </div>
  )
}
