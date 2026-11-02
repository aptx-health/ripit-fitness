'use client'

import LoggerConfirm from './LoggerConfirm'

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
  /** When true, every button is disabled and the Discard button says "Discarding…". */
  isDiscarding?: boolean
}

/**
 * Shared exit confirmation for the programmed `<ExerciseLoggingModal>` and the
 * ad-hoc logger.
 *  - With unsaved work: Save as draft (filled) / Discard (outline, error text) / Cancel
 *  - Otherwise: Cancel / Exit
 */
export default function ExitWorkoutConfirm({
  hasUnsavedWork,
  onSaveAsDraft,
  onDiscard,
  onCancel,
  isDiscarding = false,
}: Props) {
  const close = (open: boolean) => {
    if (!open) onCancel()
  }

  if (!hasUnsavedWork) {
    return (
      <LoggerConfirm
        open
        onOpenChange={close}
        title="Exit workout?"
        body="Nothing is logged yet, so there is nothing to save."
        confirmLabel={isDiscarding ? 'Exiting…' : 'Exit'}
        onConfirm={onDiscard}
        busy={isDiscarding}
      />
    )
  }

  return (
    <LoggerConfirm
      open
      onOpenChange={close}
      title="Exit workout?"
      body="Save as a draft to pick up where you left off, or discard it."
      confirmLabel="Save as draft"
      onConfirm={onSaveAsDraft}
      secondaryLabel={isDiscarding ? 'Discarding…' : 'Discard'}
      onSecondary={onDiscard}
      busy={isDiscarding}
      secondaryDisabled={isDiscarding}
    />
  )
}
