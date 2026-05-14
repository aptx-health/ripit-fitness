'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Props = {
  /**
   * Whether the session has any state worth preserving — for programmed
   * workouts that's logged sets; for ad-hoc that's logged sets OR added
   * exercises (an exercise scaffold is itself work the user might want to
   * save and come back to). Drives copy + button set.
   */
  hasUnsavedWork: boolean
  onSaveAsDraft: () => void
  onDiscard: () => void
  onCancel: () => void
}

/**
 * Shared exit-confirmation modal used by both the programmed
 * `<ExerciseLoggingModal>` and the ad-hoc logger surface.
 *  - With unsaved work: Save as Draft / Discard All / Cancel
 *  - Otherwise: Cancel / Exit
 */
export default function ExitWorkoutConfirm({
  hasUnsavedWork,
  onSaveAsDraft,
  onDiscard,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 backdrop-blur-md bg-background/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-card border-2 border-warning p-6 sm:p-8 text-center max-w-sm w-full shadow-xl doom-corners">
        <div className="text-warning mb-4 flex justify-center">
          <AlertTriangle size={56} strokeWidth={2} />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 uppercase tracking-wider">
          {hasUnsavedWork ? 'Exit Workout?' : 'Confirm Exit'}
        </h3>
        <p className="text-base sm:text-lg text-muted-foreground mb-6">
          {hasUnsavedWork
            ? 'Save as draft to pick up where you left off, or discard.'
            : 'Are you sure you want to exit?'}
        </p>
        {hasUnsavedWork ? (
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="primary"
              doom
              onClick={onSaveAsDraft}
              className="w-full px-4 py-3 text-base sm:text-lg font-bold uppercase tracking-wider"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="danger"
              doom
              onClick={onDiscard}
              className="w-full px-4 py-3 text-base sm:text-lg font-bold uppercase tracking-wider"
            >
              Discard All
            </Button>
            <Button
              type="button"
              variant="secondary"
              doom
              onClick={onCancel}
              className="w-full px-4 py-3 text-base sm:text-lg font-bold uppercase tracking-wider border-2 border-border hover:border-primary"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              doom
              onClick={onCancel}
              className="flex-1 px-4 py-3 text-base sm:text-lg font-bold uppercase tracking-wider border-2 border-border hover:border-primary"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              doom
              onClick={onDiscard}
              className="flex-1 px-4 py-3 text-base sm:text-lg font-bold uppercase tracking-wider"
            >
              Exit
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
