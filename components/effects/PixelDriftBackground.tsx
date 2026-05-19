'use client'

import { Dumbbell, Plus, Zap } from 'lucide-react'
import type { CSSProperties } from 'react'

interface DriftConfig {
  Icon: typeof Dumbbell
  size: number
  color: string
  duration: number
  delay: number
  startX: string
}

const DRIFT_ICONS: DriftConfig[] = [
  { Icon: Dumbbell, size: 20, color: 'var(--primary)', duration: 18, delay: 0, startX: '10%' },
  { Icon: Zap, size: 16, color: 'var(--accent)', duration: 22, delay: 3, startX: '28%' },
  { Icon: Plus, size: 24, color: 'var(--primary)', duration: 14, delay: 6, startX: '48%' },
  { Icon: Dumbbell, size: 16, color: 'var(--accent)', duration: 20, delay: 9, startX: '65%' },
  { Icon: Zap, size: 24, color: 'var(--primary)', duration: 16, delay: 12, startX: '82%' },
  { Icon: Plus, size: 20, color: 'var(--accent)', duration: 19, delay: 15, startX: '5%' },
]

const SVG_STYLE: CSSProperties = {
  display: 'block',
  transform: 'scale(1.6)',
  transformOrigin: 'center',
  shapeRendering: 'crispEdges',
  imageRendering: 'pixelated',
}

export function PixelDriftBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
    >
      <style>{`
        @keyframes pixel-drift {
          0%   { transform: translate(0, 0); opacity: 0; }
          15%  { opacity: 0.22; }
          85%  { transform: translate(60vw, -110vh); opacity: 0.22; }
          100% { transform: translate(70vw, -130vh); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-pixel-drift] { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
      {DRIFT_ICONS.map((cfg, i) => {
        const Icon = cfg.Icon
        const style: CSSProperties = {
          position: 'absolute',
          bottom: '-40px',
          left: cfg.startX,
          opacity: 0,
          color: cfg.color,
          willChange: 'transform, opacity',
          animation: `pixel-drift ${cfg.duration}s ${cfg.delay}s linear infinite`,
        }
        return (
          <span key={i} data-pixel-drift style={style}>
            <span style={SVG_STYLE}>
              <Icon size={cfg.size} strokeWidth={2.5} />
            </span>
          </span>
        )
      })}
    </div>
  )
}
