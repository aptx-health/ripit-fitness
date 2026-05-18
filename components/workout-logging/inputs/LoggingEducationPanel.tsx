'use client'

import { Dumbbell, Hash } from 'lucide-react'
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

  return (
    <div>
      <TipAnnotation tint={content.tint} icon={icon} className="py-2 px-3">
        <div className={`text-base font-bold uppercase tracking-wider ${labelColorClass}`}>
          {content.heading}
        </div>
      </TipAnnotation>

      {/* On short viewports (iPhone SE, mobile browser w/ URL bar) the
          cards are hidden so the keypad stays reachable — the heading
          above still identifies the mode. */}
      <div className="mt-2 grid grid-cols-2 gap-2 [@media(max-height:700px)]:hidden">
        {content.cards.map((card) => (
          <div
            key={card.label}
            className="border border-border bg-card px-3 py-2"
          >
            <div
              className={`text-sm font-bold uppercase tracking-wider ${labelColorClass}`}
            >
              {card.label}
            </div>
            <p className="mt-0.5 text-sm text-foreground leading-snug">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
