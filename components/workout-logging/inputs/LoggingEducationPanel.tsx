'use client'

import { ChevronRight, Dumbbell, Hash } from 'lucide-react'
import { useState } from 'react'
import { TipAnnotation } from '@/components/ui/TipAnnotation'

/**
 * Mode-identifying education panel rendered above the LCD readout when the
 * Weight or Reps keypad is expanded. Solves issue #768: users were mixing up
 * Weight and Reps surfaces because the only differentiation was a tiny label.
 *
 * Composition: a tinted dashed TipAnnotation header (mode identity) over a
 * 2x2 grid of bordered cards (informational rules for logging that quantity).
 * The dashed-border idiom stays scarce — only the header carries it.
 */

type Mode = 'weight' | 'reps'

interface Card {
  label: string
  description: string
}

interface ModeContent {
  tint: 'primary' | 'secondary'
  heading: string
  cards: Card[]
}

const CONTENT: Record<Mode, ModeContent> = {
  weight: {
    tint: 'primary',
    heading: 'RECORDING WEIGHT',
    cards: [
      { label: 'BARBELL', description: 'Include the bar (45 lb)' },
      { label: 'DUMBBELLS', description: 'Per hand, not the pair' },
      { label: 'BODYWEIGHT', description: '0 unless using a vest/belt' },
      { label: 'MACHINES', description: 'Weight on the stack (~10 lb/plate)' },
    ],
  },
  reps: {
    tint: 'secondary',
    heading: 'COUNTING REPS',
    cards: [
      { label: 'PER SIDE', description: 'Count one side, not both combined' },
      { label: 'BREATHER MID-SET', description: "Same set if you didn't rack the weight" },
      { label: 'WOBBLY REP', description: 'Counts if you finished it' },
      { label: 'PARTIAL REP', description: "Usually doesn't count" },
    ],
  },
}

interface LoggingEducationPanelProps {
  mode: Mode
}

export function LoggingEducationPanel({ mode }: LoggingEducationPanelProps) {
  const content = CONTENT[mode]
  const labelColorClass = content.tint === 'primary' ? 'text-primary' : 'text-secondary'
  const icon =
    mode === 'weight' ? (
      <Dumbbell size={16} strokeWidth={2.2} aria-hidden="true" />
    ) : (
      <Hash size={16} strokeWidth={2.2} aria-hidden="true" />
    )

  const [index, setIndex] = useState(0)
  const cards = content.cards
  const current = cards[index]
  const hasMultiple = cards.length > 1
  const goNext = () => setIndex((i) => (i + 1) % cards.length)

  // Mirrors the carousel arrow on <MessageCard> — a right-edge chevron
  // with a soft gradient fade. No auto-advance; the user steps through.
  const carouselOverlay = hasMultiple ? (
    <>
      <span className="absolute bottom-1.5 left-3.5 text-[10px] text-muted-foreground/50 tabular-nums">
        {index + 1}/{cards.length}
      </span>
      <button
        type="button"
        onClick={goNext}
        className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-end pr-2 doom-focus-ring"
        style={{
          background:
            'linear-gradient(to right, transparent, color-mix(in srgb, var(--muted) 85%, transparent) 40%)',
        }}
        aria-label="Next tip"
      >
        <ChevronRight size={18} className="text-muted-foreground/70" />
      </button>
    </>
  ) : null

  return (
    <TipAnnotation
      tint={content.tint}
      icon={icon}
      overlay={carouselOverlay}
      className="py-2 px-3"
    >
      <div className={`text-base font-bold uppercase tracking-wider ${labelColorClass}`}>
        {content.heading}
      </div>
      <div className="mt-2 min-h-[3.25rem] pr-10 [@media(max-height:700px)]:hidden">
        <div key={current.label} className="animate-in fade-in duration-200">
          <span className={`text-base font-bold uppercase tracking-wider ${labelColorClass}`}>
            {current.label}:
          </span>
          <span className="text-base text-muted-foreground"> {current.description}</span>
        </div>
      </div>
    </TipAnnotation>
  )
}
