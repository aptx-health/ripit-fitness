'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ExerciseImageCrossfade from '@/components/ui/ExerciseImageCrossfade'
import type { MessageData } from '@/components/ui/MessageCard'
import { MessageCard } from '@/components/ui/MessageCard'
import { useReducedMotion } from '@/lib/display'
import { pluralize } from '@/lib/format/pluralize'

interface PrescribedSet {
  id: string
  setNumber: number
  reps: string
  weight: string | null
  rpe: number | null
  rir: number | null
}

interface Exercise {
  id: string
  name: string
  notes: string | null
  exerciseDefinition?: {
    primaryFAUs: string[]
    secondaryFAUs: string[]
    equipment: string[]
    instructions?: string
    imageUrls?: string[]
  }
}

interface FollowAlongViewProps {
  exercise: Exercise
  prescribedSets: PrescribedSet[]
  message: MessageData | null
  tipCount?: number
  onNextTip?: () => void
  onMessageSeen?: (messageId: string) => void
  onMessageDismissed?: (messageId: string) => void
}

/**
 * Format prescribed sets as compact directive: "3 sets of 12 reps"
 * For varying reps: "3 sets: 12, 10, 8 reps"
 */
function formatPrescriptionDirective(prescribedSets: PrescribedSet[]): string {
  if (prescribedSets.length === 0) return 'No sets prescribed'

  const repsValues = prescribedSets.map(s => {
    const match = s.reps.match(/(\d+)(?:\s*-\s*(\d+))?/)
    if (!match) return s.reps
    return match[2] || match[1]
  })

  const allSame = repsValues.every(r => r === repsValues[0])
  const count = prescribedSets.length

  if (allSame) {
    return `${pluralize(count, 'set')} of ${repsValues[0]} reps`
  }

  return `${pluralize(count, 'set')}: ${repsValues.join(', ')} reps`
}

/**
 * Single-scroll follow-along view. No tabs — all content flows top to bottom:
 * title block, "What To Do" card, exercise image, instructions, coaching tip.
 */
export default function FollowAlongTabs({
  exercise,
  prescribedSets,
  message,
  tipCount = 0,
  onNextTip,
  onMessageSeen,
  onMessageDismissed,
}: FollowAlongViewProps) {
  const directive = formatPrescriptionDirective(prescribedSets)
  const imageUrls = exercise.exerciseDefinition?.imageUrls || []

  // Pulse animation — fires twice on exercise screen load (not with reduced motion or E-ink display)
  const cardRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const [pulseKey, setPulseKey] = useState(exercise.id)

  useEffect(() => {
    setPulseKey(exercise.id)
  }, [exercise.id])

  // biome-ignore lint/correctness/useExhaustiveDependencies: pulseKey is an intentional trigger to re-fire the pulse animation on exercise change
  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    if (reducedMotion) {
      el.classList.remove('wtd-pulse')
      return
    }

    el.classList.remove('wtd-pulse')
    // Force reflow so re-adding the class restarts the animation
    void el.offsetWidth
    el.classList.add('wtd-pulse')

    const cleanup = () => el.classList.remove('wtd-pulse')
    el.addEventListener('animationend', cleanup, { once: true })
    return () => el.removeEventListener('animationend', cleanup)
  }, [pulseKey, reducedMotion])

  // Track whether content is scrollable and not fully scrolled
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollFade, setShowScrollFade] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const hasMoreBelow = el.scrollHeight - el.scrollTop - el.clientHeight > 8
    setShowScrollFade(hasMoreBelow)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: exercise.id triggers scroll re-check when exercise changes
  useEffect(() => {
    checkScroll()
  }, [checkScroll, exercise.id])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} onScroll={checkScroll} className="h-full overflow-y-auto">
        {/* Title block — exercise name only */}
        <div className="bg-card border-b border-border px-4 py-4 text-center">
          <h2 className="text-[18px] font-semibold text-foreground uppercase tracking-wider doom-heading">
            {exercise.name}
          </h2>
        </div>

        {/* "What To Do" prescription card */}
        <div className="px-4 pt-4">
          <div
            ref={cardRef}
            className="wtd-card px-[14px] py-[14px]"
          >
            <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
              What to do
            </span>
            <span className="block text-[22px] font-medium text-foreground leading-[1.1] mt-0.5">
              {directive}
            </span>
          </div>
        </div>

        {/* Exercise demonstration */}
        <div className="px-4 pt-4">
          <ExerciseImageCrossfade
            imageUrls={imageUrls}
            exerciseName={exercise.name}
          />
        </div>

        {/* Instructions */}
        {exercise.exerciseDefinition?.instructions && (
          <div className="px-4 pt-5">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Instructions
            </h4>
            <p className="text-[17px] leading-[1.5] text-muted-foreground whitespace-pre-line">
              {exercise.exerciseDefinition.instructions}
            </p>
          </div>
        )}

        {/* Coaching tip */}
        {message && (
          <div className="px-4 pt-4 pb-4">
            <MessageCard
              message={message}
              variant="exercise_logger"
              tipCount={tipCount}
              onNextTip={onNextTip}
              onSeen={onMessageSeen}
              onDismiss={onMessageDismissed}
            />
          </div>
        )}
        </div>

        {/* Scroll fade gradient */}
        {showScrollFade && (
          <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
    </div>
  )
}
