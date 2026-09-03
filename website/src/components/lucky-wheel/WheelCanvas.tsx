import { useMemo } from 'react'

const SEGMENT_COLORS = [
  '#c9a962',
  '#1a1814',
  '#b8944f',
  '#252219',
  '#d4bc7a',
  '#1f1c17',
  '#a8893d',
]

interface WheelCanvasProps {
  prizes: Array<{ id: string; name: string }>
  rotation: number
  spinning: boolean
}

export default function WheelCanvas({ prizes, rotation, spinning }: WheelCanvasProps) {
  const count = Math.max(prizes.length, 1)
  const segmentAngle = 360 / count

  const gradient = useMemo(() => {
    const stops = prizes.map((_, i) => {
      const start = (i / count) * 100
      const end = ((i + 1) / count) * 100
      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
      return `${color} ${start}% ${end}%`
    })
    return `conic-gradient(from -90deg, ${stops.join(', ')})`
  }, [prizes, count])

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px] sm:max-w-[320px]">
      <div className="absolute inset-0 rounded-full border-4 border-marea-gold/80 shadow-[0_0_40px_rgba(201,169,98,0.25)]" />
      <div
        className="absolute inset-2 rounded-full will-change-transform"
        style={{
          background: gradient,
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
        }}
      >
        {prizes.map((prize, i) => {
          const angle = i * segmentAngle + segmentAngle / 2 - 90
          const rad = (angle * Math.PI) / 180
          const radius = 38
          const x = 50 + radius * Math.cos(rad)
          const y = 50 + radius * Math.sin(rad)
          return (
            <span
              key={prize.id}
              className="absolute max-w-[4.5rem] -translate-x-1/2 -translate-y-1/2 text-center text-[0.62rem] font-semibold leading-tight text-marea-cream drop-shadow-sm sm:max-w-[5rem] sm:text-xs"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
              }}
            >
              {prize.name}
            </span>
          )
        })}
      </div>
      <div className="pointer-events-none absolute inset-0 m-auto h-14 w-14 rounded-full border-2 border-marea-gold/60 bg-marea-bg/90 shadow-inner" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1"
        aria-hidden
      >
        <div className="h-0 w-0 border-x-[10px] border-b-[18px] border-x-transparent border-b-marea-gold drop-shadow" />
      </div>
    </div>
  )
}
