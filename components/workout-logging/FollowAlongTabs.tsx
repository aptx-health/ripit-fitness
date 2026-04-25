'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ExerciseImageCrossfade from '@/components/ui/ExerciseImageCrossfade'
import BeginnerTipCard from './BeginnerTipCard'

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
  tip: string
}

const FAU_DISPLAY_NAMES: Record<string, string> = {
  chest: 'Chest', 'mid-back': 'Mid Back', 'lower-back': 'Lower Back',
  'front-delts': 'Front Delts', 'side-delts': 'Side Delts', 'rear-delts': 'Rear Delts',
  lats: 'Lats', traps: 'Traps', biceps: 'Biceps', triceps: 'Triceps',
  forearms: 'Forearms', quads: 'Quads', adductors: 'Adductors',
  hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
  abs: 'Abs', obliques: 'Obliques',
}

/**
 * Format prescribed sets as compact subtitle: "3 x 12" or "3 sets x 12 reps".
 * For varying reps: "3 sets: 12, 10, 8"
 */
function formatPrescriptionSubtitle(prescribedSets: PrescribedSet[]): string {
  if (prescribedSets.length === 0) return 'No sets prescribed'

  const repsValues = prescribedSets.map(s => {
    const match = s.reps.match(/(\d+)(?:\s*-\s*(\d+))?/)
    if (!match) return s.reps
    return match[2] || match[1]
  })

  const allSame = repsValues.every(r => r === repsValues[0])
  const count = prescribedSets.length

  if (allSame) {
    return `${count} sets of ${repsValues[0]} repetitions`
  }

  return `${count} sets: ${repsValues.join(', ')} repetitions`
}

/**
 * Single-scroll follow-along view. No tabs — all content flows top to bottom:
 * title block, exercise image (crossfade), instructions, coaching tip.
 */
export default function FollowAlongTabs({
  exercise,
  prescribedSets,
  tip,
}: FollowAlongViewProps) {
  const subtitle = formatPrescriptionSubtitle(prescribedSets)
  const primaryMuscles = exercise.exerciseDefinition?.primaryFAUs
    ?.map(fau => FAU_DISPLAY_NAMES[fau] || fau.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
  const imageUrls = exercise.exerciseDefinition?.imageUrls || []

  // Track whether content is scrollable and not fully scrolled
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollFade, setShowScrollFade] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const hasMoreBelow = el.scrollHeight - el.scrollTop - el.clientHeight > 8
    setShowScrollFade(hasMoreBelow)
  }, [])

  useEffect(() => {
    checkScroll()
  }, [checkScroll, exercise.id])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} onScroll={checkScroll} className="h-full overflow-y-auto">
        {/* Title block */}
        <div className="bg-card border-b border-border px-4 py-4 text-center">
          <h2 className="text-xl font-bold text-foreground uppercase tracking-wider doom-heading">
            {exercise.name}
          </h2>
          <p className="text-base text-primary font-semibold mt-1">
            {subtitle}
          </p>
          {primaryMuscles && primaryMuscles.length > 0 && (
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1.5">
              {primaryMuscles.join(' \u00b7 ')}
            </p>
          )}
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
        {tip && (
          <div className="px-4 pt-4 pb-4">
            <BeginnerTipCard tip={tip} />
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
