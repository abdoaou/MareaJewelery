import { useMemo } from 'react'

interface WheelCanvasProps {
  prizes: Array<{ id: string; name: string }>
  rotation: number
  spinning: boolean
}

const SIZE = 340
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER_R = 148
const INNER_R = 44

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
  if (/free gift/i.test(name)) return 'Free Gift'
  const pct = name.match(/(\d+)\s*%/)
  if (pct) return `${pct[1]}% OFF`
  return name.length > 12 ? `${name.slice(0, 11)}…` : name
}

export default function WheelCanvas({ prizes, rotation, spinning }: WheelCanvasProps) {
  const count = Math.max(prizes.length, 1)
  const segmentAngle = 360 / count
  const labelR = (OUTER_R + INNER_R) / 2

  const segments = useMemo(
    () =>
      prizes.map((prize, i) => {
        const mid = i * segmentAngle + segmentAngle / 2
        const labelPos = polar(CX, CY, labelR, mid)
        const isGold = i % 2 === 0
        return { prize, mid, labelPos, isGold, path: annularSegment(i, count) }
      }),
    [prizes, count, segmentAngle],
  )

  return (
    <div className="wheel-stage mx-auto w-full max-w-[min(100%,340px)]">
      <div className="wheel-glow pointer-events-none absolute inset-0 rounded-full" aria-hidden />

      <div className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2" aria-hidden>
        <svg width="36" height="44" viewBox="0 0 36 44" className="drop-shadow-[0_4px_12px_rgba(201,169,98,0.55)]">
          <defs>
            <linearGradient id="wheelPointerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e8d5a3" />
              <stop offset="45%" stopColor="#c9a962" />
              <stop offset="100%" stopColor="#9a7b3c" />
            </linearGradient>
          </defs>
          <path
            d="M18 2 L32 38 Q18 32 4 38 Z"
            fill="url(#wheelPointerGrad)"
            stroke="#e8d5a3"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      <div
        className="wheel-spin relative mx-auto aspect-square w-full will-change-transform"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 4.8s cubic-bezier(0.12, 0.75, 0.08, 1)' : 'none',
        }}
      >
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full drop-shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
          role="img"
          aria-label="Lucky wheel"
        >
          <defs>
            <linearGradient id="wheelGoldSeg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e8d5a3" />
              <stop offset="40%" stopColor="#c9a962" />
              <stop offset="100%" stopColor="#9a7b3c" />
            </linearGradient>
            <linearGradient id="wheelDarkSeg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2a2620" />
              <stop offset="50%" stopColor="#1a1816" />
              <stop offset="100%" stopColor="#0f0e0c" />
            </linearGradient>
            <radialGradient id="wheelRimGlow" cx="50%" cy="50%" r="50%">
              <stop offset="78%" stopColor="transparent" />
              <stop offset="92%" stopColor="#c9a962" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#e8d5a3" stopOpacity="0.45" />
            </radialGradient>
            <filter id="wheelSegShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.35" />
            </filter>
          </defs>

          <circle cx={CX} cy={CY} r={OUTER_R + 6} fill="none" stroke="url(#wheelGoldSeg)" strokeWidth="5" />
          <circle cx={CX} cy={CY} r={OUTER_R + 2} fill="none" stroke="#0c0b0a" strokeWidth="1.5" opacity="0.45" />

          {Array.from({ length: 24 }, (_, d) => {
            const p = polar(CX, CY, OUTER_R + 6, (360 / 24) * d)
            return (
              <circle
                key={d}
                cx={p.x}
                cy={p.y}
                r={d % 3 === 0 ? 2.2 : 1.2}
                fill={d % 2 === 0 ? '#e8d5a3' : '#9a7b3c'}
                opacity={d % 3 === 0 ? 0.95 : 0.55}
              />
            )
          })}

          <g filter="url(#wheelSegShadow)">
            {segments.map(({ prize, path, isGold }) => (
              <path
                key={prize.id}
                d={path}
                fill={isGold ? 'url(#wheelGoldSeg)' : 'url(#wheelDarkSeg)'}
                stroke="#e8d5a3"
                strokeWidth="0.75"
                strokeOpacity="0.4"
              />
            ))}
          </g>

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
                strokeWidth="0.65"
                strokeOpacity="0.35"
              />
            )
          })}

          <circle cx={CX} cy={CY} r={OUTER_R} fill="url(#wheelRimGlow)" pointerEvents="none" />

          {segments.map(({ prize, mid, labelPos, isGold }) => (
            <text
              key={`label-${prize.id}`}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${mid}, ${labelPos.x}, ${labelPos.y})`}
              className="select-none"
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: count > 6 ? 11 : 12.5,
                fontWeight: 600,
                letterSpacing: '0.05em',
                fill: isGold ? '#1a1208' : '#f5efe3',
              }}
            >
              {shortLabel(prize.name)}
            </text>
          ))}
        </svg>
      </div>

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-[5.25rem] w-[5.25rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[3px] border-marea-gold bg-gradient-to-br from-marea-bg-card via-marea-bg-soft to-marea-bg shadow-[inset_0_2px_10px_rgba(201,169,98,0.2),0_6px_20px_rgba(0,0,0,0.45)]"
        aria-hidden
      >
        <span className="font-serif text-[1.65rem] leading-none text-marea-gold">✦</span>
        <span className="mt-0.5 text-[0.55rem] tracking-[0.25em] text-marea-gold/80 uppercase">Marea</span>
      </div>
    </div>
  )
}
