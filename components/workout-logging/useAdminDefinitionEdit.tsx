'use client'

import { Wrench } from 'lucide-react'
import { useState } from 'react'
import QuickEditExerciseSheet, {
  type SavedDefinition,
} from '@/components/features/exercise-definition/QuickEditExerciseSheet'
import type { QuickAction } from './ExerciseQuickActionsMenu'

export const ADMIN_DEFINITION_EDIT_LABEL = 'Edit exercise definition (Admin)'

/**
 * The loggers' "Edit exercise definition (Admin)" menu item and the quick
 * editor it opens. Editor and admin roles only: it edits the shared (system)
 * definition, unlike "Edit this exercise". `onSaved` gets the saved definition
 * and the name before the save, so the logger can show it in place (keeping
 * the user's spot and inputs), renaming only exercises still on the old name
 * as the server does.
 */
export function useAdminDefinitionEdit({
  enabled,
  definitionId,
  onSaved,
}: {
  enabled: boolean
  definitionId: string | undefined
  onSaved: (definition: SavedDefinition, previousName: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const actions: QuickAction[] =
    enabled && definitionId
      ? [{ label: ADMIN_DEFINITION_EDIT_LABEL, icon: Wrench, onClick: () => setEditingId(definitionId) }]
      : []

  const sheet = editingId ? (
    <QuickEditExerciseSheet
      isOpen
      onClose={() => setEditingId(null)}
      exerciseId={editingId}
      context="workout"
      onSaved={onSaved}
    />
  ) : null

  return { actions, sheet }
}
