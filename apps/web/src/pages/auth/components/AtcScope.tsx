import type { CSSProperties } from 'react'
import styles from './AtcScope.module.css'

const CX = 300
const CY = 260
const R = 230

/** 36 bearing ticks: a long tick every 30 degrees, a short one in between. */
function tickPath(): string {
  const parts: string[] = []
  for (let i = 0; i < 36; i += 1) {
    const angle = (i * 10 * Math.PI) / 180
    const inner = i % 3 === 0 ? R - 14 : R - 7
    const point = (r: number) => `${(CX + r * Math.sin(angle)).toFixed(1)} ${(CY - r * Math.cos(angle)).toFixed(1)}`
    parts.push(`M${point(inner)}L${point(R)}`)
  }
  return parts.join('')
}

const TICKS = tickPath()

const BLIPS = [
  { x: 392.9, y: 141.6, delay: 0.46 },
  { x: 442.0, y: 378.6, delay: 0.81 },
  { x: 183.7, y: 297.5, delay: 1.27 },
]

const delay = (seconds: number, duration?: number): CSSProperties =>
  ({ '--d': `${seconds}s`, ...(duration ? { '--t': `${duration}s` } : {}) }) as CSSProperties

/**
 * ATC radar entrance (about 3.1s, plays once on mount): rings, ticks and bearings draw in, a phosphor sweep
 * picks up three blips, and a plane flies a dotted track into the MARACAY marker; afterwards a faint sweep
 * idles. CSS/SVG only. With reduced motion the final composition renders still.
 */
export function AtcScope() {
  return (
    <div className={styles.scope}>
      <svg viewBox="0 0 600 520" fill="none" strokeWidth="1" focusable="false">
        <g stroke="var(--n-4)" vectorEffect="non-scaling-stroke">
          <circle cx={CX} cy={CY} r={R} className={styles.draw} pathLength={1} style={delay(0, 1)} />
          <circle cx={CX} cy={CY} r="153" className={styles.fade} style={delay(0.15)} />
          <circle cx={CX} cy={CY} r="77" className={styles.fade} style={delay(0.3)} />
          <path d="M300 30V490M70 260H530" className={styles.fade} style={delay(0.2)} />
        </g>
        <path d={TICKS} stroke="var(--n-6)" className={styles.fade} style={delay(0.3)} />
        <g className={styles.fade} style={delay(0.4)}>
          <text x="300" y="14" textAnchor="middle">
            000
          </text>
          <text x="556" y="264" textAnchor="middle">
            090
          </text>
          <text x="300" y="514" textAnchor="middle">
            180
          </text>
          <text x="44" y="264" textAnchor="middle">
            270
          </text>
        </g>
        {BLIPS.map((blip) => (
          <g key={blip.x} className={styles.pop} style={delay(blip.delay)}>
            <rect x={blip.x} y={blip.y} width="7" height="7" stroke="var(--n-9)" />
          </g>
        ))}
        <g className={styles.fade} style={delay(1.6)}>
          <rect x="296" y="256" width="8" height="8" stroke="var(--n-10)" />
          <text x="312" y="282">
            MARACAY
          </text>
        </g>
        <rect
          x="120.4"
          y="133.2"
          width="7"
          height="7"
          stroke="var(--n-10)"
          className={styles.pop}
          style={delay(1.49)}
        />
        <path
          d="M124 137 C190 140 250 190 292 252"
          stroke="var(--n-8)"
          strokeDasharray="3 4"
          className={styles.fade}
          style={delay(1.7, 1.2)}
        />
        <g className={styles.plane}>
          <polygon
            points="12,0 7,-1 0,-1 -4,-5.5 -6.5,-5.5 -4,-1 -8.5,-1 -10,-3.5 -11,-3.5 -10,0 -11,3.5 -10,3.5 -8.5,1 -4,1 -6.5,5.5 -4,5.5 0,1 7,1"
            fill="var(--n-10)"
            stroke="none"
            transform="scale(1.5)"
          />
        </g>
      </svg>
      <div className={styles.sweep} />
    </div>
  )
}
