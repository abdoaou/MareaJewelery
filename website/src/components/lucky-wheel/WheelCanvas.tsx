import { useMemo } from 'react'

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
const OUTER_R = 150
const INNER_R = 46

export const WHEEL_SPIN_MS = 3200
export const WHEEL_SPIN_EASING = 'cubic-bezier(0.12, 0.72, 0.08, 1)'

/** Align segment center with the top pointer from the current wheel angle. */
export function computeWheelTargetRotation(
  currentRotation: number,
  segmentIndex: number,
  segmentCount: number,
  extraTurns = 4,
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

function shortLabel(name: string) {
  if (/better luck/i.test(name)) return 'Try Again'
  if (/free shipping/i.test(name)) return 'Free Ship'
  if (/free gift/i.test(name)) return 'Gift'
  const pct = name.match(/(\d+)\s*%/)
  if (pct) return `${pct[1]}%`
  return name.length > 10 ? `${name.slice(0, 9)}…` : name
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

  const segments = useMemo(
    () =>
      prizes.map((prize, i) => {
        const mid = i * segmentAngle + segmentAngle / 2
        const labelPos = polar(CX, CY, labelR, mid)
        const isGold = i % 2 === 0
        return { prize, i, mid, labelPos, isGold, path: annularSegment(i, count) }
      }),
    [prizes, count, segmentAngle],
  )

  return (
    <div className="wheel-stage mx-auto">
      <div className="wheel-glow pointer-events-none absolute inset-0 rounded-full" aria-hidden />

      <div className="wheel-pointer pointer-events-none absolute left-1/2 z-30 -translate-x-1/2" aria-hidden>
        <svg viewBox="0 0 28 36" className="h-auto w-full drop-shadow-[0_3px_10px_rgba(201,169,98,0.5)]">
          <defs>
            <linearGradient id="wheelPointerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f0e0b8" />
              <stop offset="100%" stopColor="#9a7b3c" />
            </linearGradient>
          </defs>
          <path d="M14 0 L26 32 Q14 28 2 32 Z" fill="url(#wheelPointerGrad)" stroke="#e8d5a3" strokeWidth="1" />
        </svg>
      </div>

      <div
        className={`wheel-spin relative mx-auto aspect-square w-full will-change-transform${spinning ? ' wheel-spin--active' : ''}${preSpinning ? ' wheel-spin--pre' : ''}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning && !preSpinning
            ? `transform ${spinDurationMs}ms ${WHEEL_SPIN_EASING}`
            : 'none',
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="wheel-svg h-full w-full" role="img" aria-label="Lucky wheel">
          <defs>
            <linearGradient id="wheelGoldSeg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0e0b8" />
              <stop offset="50%" stopColor="#c9a962" />
              <stop offset="100%" stopColor="#a8893d" />
            </linearGradient>
            <linearGradient id="wheelDarkSeg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#242018" />
              <stop offset="100%" stopColor="#121010" />
            </linearGradient>
            <linearGradient id="wheelWinGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff8e7" />
              <stop offset="50%" stopColor="#e8d5a3" />
              <stop offset="100%" stopColor="#c9a962" />
            </linearGradient>
          </defs>

          <circle cx={CX} cy={CY} r={OUTER_R + 8} fill="#0c0b0a" />
          <circle cx={CX} cy={CY} r={OUTER_R + 8} fill="none" stroke="url(#wheelGoldSeg)" strokeWidth="2.5" />
          <circle cx={CX} cy={CY} r={OUTER_R + 4} fill="none" stroke="#e8d5a3" strokeWidth="0.5" opacity="0.4" />

          {segments.map(({ prize, i, path, isGold }) => {
            const isWinner = highlightIndex === i
            return (
              <path
                key={prize.id}
                d={path}
                fill={isWinner ? 'url(#wheelWinGlow)' : isGold ? 'url(#wheelGoldSeg)' : 'url(#wheelDarkSeg)'}
                stroke={isWinner ? '#fff8e7' : '#e8d5a3'}
                strokeWidth={isWinner ? 1.2 : 0.5}
                strokeOpacity={isWinner ? 0.9 : 0.25}
                style={isWinner ? { filter: 'drop-shadow(0 0 8px rgba(201,169,98,0.6))' } : undefined}
              />
            )
          })}

          {prizes.map((_, i) => {
            const a = i * segmentAngle
            const p1 = polar(CX, CY, INNER_R, a)
            const p2 = polar(CX, CY, OUTER_R, a)
            return (
              <line
                key={`spoke-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#e8d5a3"
                strokeWidth="0.5"
                strokeOpacity="0.3"
              />
            )
          })}

          {segments.map(({ prize, mid, labelPos, isGold, i }) => (
            <text
              key={`label-${prize.id}`}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${mid}, ${labelPos.x}, ${labelPos.y})`}
              className={`wheel-segment-label select-none ${highlightIndex === i ? 'wheel-segment-label--win' : ''}`}
              fill={highlightIndex === i ? '#1a1208' : isGold ? '#1a1208' : '#f8f4eb'}
            >
              {shortLabel(prize.name)}
            </text>
          ))}
        </svg>
      </div>

      <div className="wheel-center-ring pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-marea-gold/80 bg-marea-bg shadow-[0_4px_20px_rgba(0,0,0,0.5)]" aria-hidden />
    </div>
  )
}

