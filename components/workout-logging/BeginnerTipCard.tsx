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
      style={{
        padding: '14px 14px',
        marginTop: 12,
        border: '0.5px dashed rgba(138,111,74,0.4)',
        background: 'rgba(243,234,217,0.35)',
        borderRadius: 0,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8a6f4a"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 5 }}
      >
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5C8.35 12.26 8.82 13.02 9 14" />
      </svg>
      <span
        aria-live="polite"
        style={{
          fontSize: 18,
          lineHeight: 1.55,
          color: '#8a6f4a',
          fontWeight: 400,
        }}
      >
        {displayText}
      </span>
    </div>
  )
}
