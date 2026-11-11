import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

interface WheelCanvasProps {
  prizes: Array<{ id: string; name: string; type?: string; value?: number | null }>
  rotation: number
  spinning: boolean
  preSpinning?: boolean
  highlightIndex?: number | null
}

const CX = 0
const CY = 0
const OUTER_R = 172
const INNER_R = 54
const RIM_OUTER = 188
const STUD_COUNT = 28

export { WHEEL_SPIN_MS, WHEEL_EXTRA_TURNS, computeWheelTargetRotation } from './wheelSpinAnimation'

type SegmentTone = 'gold' | 'pearl' | 'onyx'

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

function isPremiumPrize(prize: { name: string; type?: string; value?: number | null }) {
  if (prize.type === 'FREE_GIFT') return true
  if (prize.type === 'DISCOUNT' && prize.value != null && prize.value >= 25) return true
  return /25\s*%|gift/i.test(prize.name) && !/shipping/i.test(prize.name)
}

function assignTones(
  prizes: Array<{ name: string; type?: string; value?: number | null }>,
): SegmentTone[] {
  const tones: SegmentTone[] = []
  const cycle: SegmentTone[] = ['gold', 'pearl', 'onyx']

  for (let i = 0; i < prizes.length; i++) {
    const premium = isPremiumPrize(prizes[i])
    const prev = tones[i - 1]

    if (premium) {
      tones.push(prev === 'onyx' ? 'gold' : 'onyx')
      continue
    }

    let pick = cycle.find((t) => t !== prev) ?? 'gold'
    if (i === prizes.length - 1 && pick === tones[0]) {
      pick = cycle.find((t) => t !== prev && t !== tones[0]) ?? pick
    }
    tones.push(pick)
  }

  for (let i = 0; i < tones.length; i++) {
    if (isPremiumPrize(prizes[i])) {
      const prev = tones[i - 1]
      const next = tones[i + 1]
      if (prev !== 'onyx' && next !== 'onyx') tones[i] = 'onyx'
    }
  }

  return tones
}

function shortLabel(name: string) {
  if (/better luck|try again|no prize/i.test(name)) return 'Try Again'
  if (/free shipping/i.test(name)) return 'Free Ship'
  if (/free gift/i.test(name)) return 'Gift'
  const pct = name.match(/(\d+)\s*%/)
  if (pct) return `${pct[1]}%`
  return name.length > 11 ? `${name.slice(0, 10)}…` : name
}

function labelIsPercent(name: string) {
  return /\d+\s*%/.test(name) && !/shipping/i.test(name)
}

function labelFill(tone: SegmentTone) {
  if (tone === 'onyx') return '#D4B97A'
  return '#2A1F0E'
}

export default function WheelCanvas({
  prizes,
  rotation,
  spinning,
  preSpinning = false,
  highlightIndex = null,
}: WheelCanvasProps) {
  const count = Math.max(prizes.length, 1)
  const segmentAngle = 360 / count
  const labelR = (OUTER_R + INNER_R) / 2 - 6
  const pointerActive = spinning || preSpinning

  const tones = useMemo(() => assignTones(prizes), [prizes])

  const segments = useMemo(
    () =>
      prizes.map((prize, i) => {
        const mid = i * segmentAngle + segmentAngle / 2
        const labelPos = polar(CX, CY, labelR, mid)
        const tone = tones[i]
        const center = polar(CX, CY, (OUTER_R + INNER_R) / 2, mid)
        return { prize, i, mid, labelPos, tone, center, path: annularSegment(i, count), premium: isPremiumPrize(prize) }
      }),
    [prizes, count, segmentAngle, tones],
  )

  const studs = useMemo(() => {
    return Array.from({ length: STUD_COUNT }, (_, k) => {
      const deg = (360 / STUD_COUNT) * k
      const p = polar(CX, CY, RIM_OUTER - 2, deg)
      return { ...p, key: k }
    })
  }, [])

  const lastTickRef = useRef(Math.floor(rotation / segmentAngle))
  const [pointerFlick, setPointerFlick] = useState(false)

  useEffect(() => {
    if (!pointerActive) return
    const boundary = Math.floor(rotation / segmentAngle)
    if (boundary !== lastTickRef.current) {
      lastTickRef.current = boundary
      setPointerFlick(true)
      const t = window.setTimeout(() => setPointerFlick(false), 90)
      return () => window.clearTimeout(t)
    }
  }, [rotation, segmentAngle, pointerActive])

  return (
    <div className="wheel-stage mx-auto">
      <div className="wheel-drop-shadow pointer-events-none absolute inset-0" aria-hidden />

      <div
        className={`wheel-pointer pointer-events-none absolute left-1/2 z-30 -translate-x-1/2${pointerActive ? ' wheel-pointer--active' : ''}${pointerFlick ? ' wheel-pointer--flick' : ''}`}
        aria-hidden
      >
        <svg viewBox="0 0 34 48" className="h-auto w-full">
          <defs>
            <linearGradient id="mareaPointerGold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F3E9D2" />
              <stop offset="45%" stopColor="#D4B97A" />
              <stop offset="100%" stopColor="#8C6B2E" />
            </linearGradient>
            <radialGradient id="mareaPointerGem" cx="50%" cy="30%" r="45%">
              <stop offset="0%" stopColor="#1A1612" />
              <stop offset="55%" stopColor="#2A2420" />
              <stop offset="100%" stopColor="#1A1612" />
            </radialGradient>
          </defs>
          <path
            d="M17 1 L31 42 Q17 37 3 42 Z"
            fill="url(#mareaPointerGold)"
            stroke="#B8924A"
            strokeWidth="0.6"
          />
          <ellipse cx="17" cy="14" rx="5" ry="4" fill="url(#mareaPointerGem)" />
          <ellipse cx="15.5" cy="12.5" rx="1.4" ry="1" fill="#FFFFFF" opacity="0.85" />
        </svg>
      </div>

      <div
        className={`wheel-spin relative mx-auto aspect-square w-full will-change-transform${spinning ? ' wheel-spin--active' : ''}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg
          viewBox="-250 -250 500 500"
          className="wheel-svg h-full w-full"
          role="img"
          aria-label="Prize wheel with segments for discounts and gifts"
        >
          <defs>
            <linearGradient id="rimPolish" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8C6B2E" />
              <stop offset="22%" stopColor="#F3E9D2" />
              <stop offset="50%" stopColor="#D4B97A" />
              <stop offset="78%" stopColor="#B8924A" />
              <stop offset="100%" stopColor="#8C6B2E" />
            </linearGradient>
            <radialGradient id="studGem" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#F3E9D2" />
              <stop offset="100%" stopColor="#B8924A" />
            </radialGradient>
            <filter id="wheelDropShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#1A1612" floodOpacity="0.28" />
            </filter>
            <filter id="winGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {segments.map(({ i, center, tone }) => {
              const stops =
                tone === 'gold'
                  ? [
                      ['0%', '#F3E9D2'],
                      ['55%', '#D4B97A'],
                      ['100%', '#B8924A'],
                    ]
                  : tone === 'pearl'
                    ? [
                        ['0%', '#FBF7EE'],
                        ['50%', '#F3E9D2'],
                        ['100%', '#C9B896'],
                      ]
                    : [
                        ['0%', '#2E2824'],
                        ['50%', '#1A1612'],
                        ['100%', '#0E0C0A'],
                      ]
              return (
                <radialGradient
                  key={`g-${i}`}
                  id={`segGrad-${i}`}
                  gradientUnits="userSpaceOnUse"
                  cx={center.x}
                  cy={center.y}
                  r={OUTER_R - 10}
                >
                  {stops.map(([offset, color]) => (
                    <stop key={offset} offset={offset} stopColor={color} />
                  ))}
                </radialGradient>
              )
            })}
          </defs>

          <g filter="url(#wheelDropShadow)">
            <circle cx={CX} cy={CY} r={RIM_OUTER + 2} fill="#1A1612" opacity="0.06" />

            <circle cx={CX} cy={CY} r={RIM_OUTER} fill="none" stroke="url(#rimPolish)" strokeWidth="7" />
            <circle cx={CX} cy={CY} r={OUTER_R + 6} fill="none" stroke="#1A1612" strokeWidth="2.2" />
            <circle cx={CX} cy={CY} r={OUTER_R + 3.5} fill="none" stroke="url(#rimPolish)" strokeWidth="1.4" opacity="0.85" />
            <circle cx={CX} cy={CY} r={OUTER_R + 1} fill="none" stroke="#1A1612" strokeWidth="1.8" />

            {studs.map((s) => (
              <circle
                key={s.key}
                cx={s.x}
                cy={s.y}
                r="3.25"
                fill="url(#studGem)"
                stroke="#D4B97A"
                strokeWidth="0.35"
                className="wheel-stud-twinkle"
                style={{ '--stud-i': s.key } as CSSProperties}
              />
            ))}

            {segments.map(({ prize, i, path, tone, center, premium }) => {
              const isWinner = highlightIndex === i
              return (
                <g key={prize.id} className={isWinner ? 'wheel-segment-win' : undefined}>
                  <path
                    d={path}
                    fill={`url(#segGrad-${i})`}
                    stroke="#E8D4A8"
                    strokeWidth="0.55"
                    strokeOpacity="0.45"
                    filter={isWinner ? 'url(#winGlow)' : undefined}
                  />
                  {premium && tone === 'onyx' && (
                    <path
                      d={`M ${center.x} ${center.y - 14} L ${center.x + 6} ${center.y} L ${center.x} ${center.y + 14} L ${center.x - 6} ${center.y} Z`}
                      fill="#D4B97A"
                      opacity="0.85"
                    />
                  )}
                </g>
              )
            })}

            {prizes.map((_, i) => {
              const a = i * segmentAngle
              const p1 = polar(CX, CY, INNER_R + 1, a)
              const p2 = polar(CX, CY, OUTER_R - 2, a)
              return (
                <line
                  key={`divider-${i}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#E8D4A8"
                  strokeWidth="0.65"
                  strokeOpacity="0.7"
                />
              )
            })}

            <ellipse
              cx={CX - 40}
              cy={CY - 50}
              rx={OUTER_R * 0.85}
              ry={OUTER_R * 0.35}
              fill="#FFFFFF"
              opacity="0.07"
              transform="rotate(-28)"
              className="wheel-face-glare"
            />

            {segments.map(({ prize, mid, labelPos, tone, i }) => {
              const pct = labelIsPercent(prize.name)
              return (
                <text
                  key={`label-${prize.id}`}
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${mid}, ${labelPos.x}, ${labelPos.y})`}
                  className={`wheel-segment-label select-none${pct ? ' wheel-segment-label--pct' : ' wheel-segment-label--word'}${highlightIndex === i ? ' wheel-segment-label--win' : ''}`}
                  fill={labelFill(tone)}
                >
                  {shortLabel(prize.name)}
                </text>
              )
            })}
          </g>
        </svg>
      </div>

      <div className="wheel-hub-medallion pointer-events-none absolute left-1/2 top-1/2 z-[15] -translate-x-1/2 -translate-y-1/2" aria-hidden>
        <svg viewBox="0 0 96 96" className="h-full w-full">
          <circle cx="48" cy="48" r="46" fill="none" stroke="#1A1612" strokeWidth="3" />
          <circle cx="48" cy="48" r="42" fill="url(#rimPolish)" stroke="#B8924A" strokeWidth="1.2" />
          <circle cx="48" cy="48" r="38" fill="#FBF7EE" />
          <circle cx="48" cy="48" r="34" fill="none" stroke="#D4B97A" strokeWidth="0.65" opacity="0.9" />
          <text x="48" y="54" textAnchor="middle" className="wheel-hub-monogram" fill="#B8924A">
            M
          </text>
        </svg>
      </div>
    </div>
  )
}
