'use client'

import LoggerConfirm from '@/components/workout-logging/LoggerConfirm'
import { pluralize } from '@/lib/format/pluralize'

/**
 * Layers for editing an exercise definition over the workout logger. The
 * logger's plan sheet is z-[90] and its confirms z-[95]; the quick editor
 * sits above those, the full editor above the quick editor, and these
 * confirms above both. Menus and toasts stay on top at z-[100].
 */
export const QUICK_EDIT_Z = 96
/** The full editor's overlay; its box is one above (98). */
export const FULL_EDITOR_Z = 97
const CONFIRM_Z = 99

/** Asked before saving a definition: the change applies for every user. */
export function SaveForEveryoneConfirm({
  open,
  name,
  previousName,
  usageCount,
  saving,
  onConfirm,
  onKeepEditing,
}: {
  open: boolean
  name: string
  /** The saved name; when it differs from `name`, workouts still named it get renamed too. */
  previousName?: string
  usageCount: number
  saving: boolean
  onConfirm: () => void
  onKeepEditing: () => void
}) {
  const renames = !!previousName && !!name && previousName !== name
  return (
    <LoggerConfirm
      open={open}
      onOpenChange={(next) => {
        if (!next) onKeepEditing()
      }}
      title="Save for everyone?"
      body={`This changes ${name || 'this exercise'} for every user. It is used in ${pluralize(usageCount, 'workout')}.${
        renames ? ` Workouts still named ${previousName} are renamed too.` : ''
      }`}
      confirmLabel={saving ? 'Saving…' : 'Save for everyone'}
      cancelLabel="Keep editing"
      onConfirm={onConfirm}
      busy={saving}
      zIndex={CONFIRM_Z}
    />
  )
}

/** Asked when closing an editor that has unsaved changes. */
export function DiscardChangesConfirm({
  open,
  onDiscard,
  onKeepEditing,
}: {
  open: boolean
  onDiscard: () => void
  onKeepEditing: () => void
}) {
  return (
    <LoggerConfirm
      open={open}
      onOpenChange={(next) => {
        if (!next) onKeepEditing()
      }}
      title="Discard changes?"
      body="Your changes to this exercise are not saved."
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      onConfirm={onDiscard}
      destructive
      zIndex={CONFIRM_Z}
    />
  )
}
