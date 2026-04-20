'use client'

import { clientLogger } from '@/lib/client-logger'

interface BeginnerTipCardProps {
  tip: string
  visible?: boolean
}

const MAX_TIP_LENGTH = 180

export default function BeginnerTipCard({ tip, visible = true }: BeginnerTipCardProps) {
  if (!visible || !tip) return null

  let displayText = tip
  if (tip.length > MAX_TIP_LENGTH) {
    clientLogger.warn(`Tip exceeds ${MAX_TIP_LENGTH} chars: "${tip.slice(0, 40)}..."`)
    displayText = `${tip.slice(0, MAX_TIP_LENGTH - 3)}...`
  }

  return (
    <div
      role="note"
      className="flex items-start gap-2.5 mt-3 p-3.5 border border-dashed border-border/40 bg-muted/35"
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="shrink-0 mt-[5px] stroke-muted-foreground"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5C8.35 12.26 8.82 13.02 9 14" />
      </svg>
      <span
        aria-live="polite"
        className="text-lg leading-relaxed text-muted-foreground"
      >
        {displayText}
      </span>
    </div>
  )
}
