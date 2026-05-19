'use client'

import { Dumbbell, Plus, Zap } from 'lucide-react'

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

export function PixelDriftBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
    >
      {DRIFT_ICONS.map((cfg, i) => {
        const Icon = cfg.Icon
        return (
          <span
            key={i}
            className="pixel-drift-icon"
            style={{
              left: cfg.startX,
              animationDuration: `${cfg.duration}s`,
              animationDelay: `${cfg.delay}s`,
              color: cfg.color,
            }}
          >
            <Icon size={cfg.size} strokeWidth={2.5} />
          </span>
        )
      })}
    </div>
  )
}
