'use client'

import { Dumbbell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDraftWorkout } from '@/lib/contexts/DraftWorkoutContext'

export default function FloatingDraftButton() {
  const { activeDraft } = useDraftWorkout()
  const router = useRouter()

  if (!activeDraft) return null

  return (
    <button
      onClick={() => {
        if (confirm(`Resume "${activeDraft.workoutName}"?`)) {
          router.push(`/training?resume=${activeDraft.workoutId}`)
        }
      }}
      className="md:hidden fixed right-4 min-h-12 min-w-12 flex items-center justify-center rounded-full bg-accent text-white shadow-lg animate-pulse"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        zIndex: 45,
      }}
      aria-label={`Resume draft workout: ${activeDraft.workoutName}`}
    >
      <Dumbbell className="h-5 w-5" />
    </button>
  )
}
