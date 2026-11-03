import type { WeekSets } from '@/lib/insights/lift-history'
import { weekOfLabel } from './format'

/**
 * The lift page's charts, hand-drawn SVG in theme tokens (no chart library)
 * so they follow light and dark. A line over time (e1RM, top set or reps),
 * with a light fill beneath in the folder's colour and an optional dashed
 * second line, and weekly bars for volume. Each chart
 * is one labelled image (role="img", so its parts are hidden from readers);
 * the hooks (data-point, data-bar…) carry the raw values.
 */

const W = 320
const H = 150
const PAD = { left: 34, right: 10, top: 10, bottom: 22 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom
const TEXT = { fontSize: 10, fontWeight: 600, fill: 'var(--muted-foreground)' }

export interface LinePoint {
  date: Date
  value: number
  /** The top set's reps, on the Top set chart. */
  reps?: number
  isPr?: boolean
}

/** Rounded gridline values spanning [low, high]: three, evenly spaced. */
function gridValues(low: number, high: number): number[] {
  const step = Math.max(1, Math.ceil((high - low) / 2))
  const bottom = Math.floor(low)
  return [bottom, bottom + step, bottom + 2 * step]
}

function Grid({ values, y }: { values: number[]; y: (v: number) => number }) {
  return (
    <g>
      {values.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
          <text x={PAD.left - 5} y={y(v) + 3.5} textAnchor="end" className="tabular-nums" {...TEXT}>
            {v}
          </text>
        </g>
      ))}
    </g>
  )
}

export function LineChart({
  kind,
  label,
  points,
  overlay,
  dateLabel,
}: {
  kind: 'e1rm' | 'top-set' | 'reps'
  /** The image's accessible name. */
  label: string
  points: LinePoint[]
  /** The dashed top-set line on the e1RM chart. */
  overlay?: Array<{ date: Date; value: number }>
  dateLabel: (date: Date) => string
}) {
  const all = [...points, ...(overlay ?? [])]
  const values = all.map((p) => p.value)
  const grid = gridValues(Math.min(...values), Math.max(...values))
  const yLow = grid[0]
  const yHigh = grid[2]
  const y = (v: number) => PAD.top + PLOT_H - ((v - yLow) / (yHigh - yLow)) * PLOT_H
  const times = all.map((p) => p.date.getTime())
  const t0 = Math.min(...times)
  const t1 = Math.max(...times)
  const x = (d: Date) => (t1 === t0 ? PAD.left + PLOT_W / 2 : PAD.left + ((d.getTime() - t0) / (t1 - t0)) * PLOT_W)
  const path = (ps: Array<{ date: Date; value: number }>) =>
    ps.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const first = points[0]
  const last = points[points.length - 1]

  return (
    <svg data-chart={kind} role="img" aria-label={label} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
      <Grid values={grid} y={y} />
      {points.length > 1 && (
        <path
          data-fill=""
          d={`${path(points)} L${x(last.date).toFixed(1)},${PAD.top + PLOT_H} L${x(first.date).toFixed(1)},${PAD.top + PLOT_H} Z`}
          fill="var(--secondary)"
          fillOpacity={0.14}
        />
      )}
      {overlay && overlay.length > 1 && (
        <path
          data-series="top-set"
          d={path(overlay)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeDasharray="5 4"
        />
      )}
      {points.length > 1 && <path d={path(points)} fill="none" stroke="var(--secondary)" strokeWidth={2.5} strokeLinejoin="round" />}
      {points.map((p) => (
        <circle
          key={p.date.getTime()}
          data-point=""
          data-value={p.value}
          data-reps={p.reps}
          data-pr={p.isPr ? 'true' : undefined}
          cx={x(p.date)}
          cy={y(p.value)}
          r={p.isPr ? 5.5 : points.length > 40 ? 2 : 3}
          fill={p.isPr ? 'var(--accent)' : 'var(--secondary)'}
          stroke={p.isPr ? 'var(--foreground)' : 'none'}
          strokeWidth={1.5}
        />
      ))}
      {first && (
        <g>
          <text x={PAD.left} y={H - 6} textAnchor="start" {...TEXT}>
            {dateLabel(first.date)}
          </text>
          {last !== first && (
            <text x={W - PAD.right} y={H - 6} textAnchor="end" {...TEXT}>
              {dateLabel(last.date)}
            </text>
          )}
        </g>
      )}
    </svg>
  )
}

export function BarChart({ weeks, label }: { weeks: WeekSets[]; label: string }) {
  const most = Math.max(...weeks.map((w) => w.sets))
  const top = Math.max(10, Math.ceil(most / 10) * 10)
  const y = (v: number) => PAD.top + PLOT_H - (v / top) * PLOT_H
  const slot = PLOT_W / weeks.length
  const gap = Math.min(3, slot * 0.25)

  return (
    <svg data-chart="volume" role="img" aria-label={label} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
      <Grid values={[0, top / 2, top]} y={y} />
      {weeks.map((w, i) => (
        <rect
          key={w.weekStart}
          data-bar=""
          data-value={w.sets}
          x={PAD.left + i * slot + gap / 2}
          y={y(w.sets)}
          width={slot - gap}
          height={PAD.top + PLOT_H - y(w.sets)}
          fill={i === weeks.length - 1 ? 'var(--primary)' : 'var(--secondary)'}
        />
      ))}
      {weeks.length > 0 && (
        <g>
          <text x={PAD.left} y={H - 6} textAnchor="start" {...TEXT}>
            {weekOfLabel(weeks[0].weekStart)}
          </text>
          {weeks.length > 1 && (
            <text x={W - PAD.right} y={H - 6} textAnchor="end" {...TEXT}>
              {weekOfLabel(weeks[weeks.length - 1].weekStart)}
            </text>
          )}
        </g>
      )}
    </svg>
  )
}
