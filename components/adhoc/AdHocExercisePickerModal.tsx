'use client'

import { Sparkles } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import {
  type ExerciseDefinition,
  ExerciseSearchInterface,
} from '@/components/exercise-selection/ExerciseSearchInterface'
import ExerciseDefinitionEditorModal from '@/components/features/exercise-definition/ExerciseDefinitionEditorModal'
import type { MuscleBalanceSnapshot } from '@/components/features/muscle-balance/types'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/radix/dialog'
import { TipAnnotation } from '@/components/ui/TipAnnotation'
import { ALL_FAUS, type FAUKey } from '@/lib/fau-volume'

const HYPOTHETICAL_SETS_PER_EXERCISE = 3

export type PickerMode =
  | { kind: 'add' }
  | { kind: 'swap'; replacingName: string; targetId?: string }

export function AdHocEmptyState() {
  return (
    <div className="flex-1 overflow-auto px-5 py-6">
      <div className="mx-auto flex min-h-full max-w-xl items-center">
        <div className="flex min-h-[34vh] items-center">
          <TipAnnotation
            icon={<Sparkles aria-hidden="true" size={20} strokeWidth={1.8} />}
          >
            <span className="text-2xl sm:text-3xl leading-relaxed text-foreground">
              Pick your first exercise to start logging. Add as many as you want as you go.
            </span>
          </TipAnnotation>
        </div>
      </div>
    </div>
  )
}

type Props = {
  mode: PickerMode
  onClose: () => void
  onConfirm: (defs: ExerciseDefinition[]) => void
  isBusy: boolean
  muscleBalanceSnapshot: MuscleBalanceSnapshot
  plannedExerciseDefinitions?: Array<{
    primaryFAUs: string[]
    secondaryFAUs: string[]
  }>
}

export function AdHocExercisePickerModal({
  mode,
  onClose,
  onConfirm,
  isBusy,
  muscleBalanceSnapshot,
  plannedExerciseDefinitions = [],
}: Props) {
  const isAdd = mode.kind === 'add'
  const [selectedDefs, setSelectedDefs] = useState<ExerciseDefinition[]>([])
  const selectedIds = new Set(selectedDefs.map((d) => d.id))
  const [showCreateModal, setShowCreateModal] = useState(false)
  const plannedFAUVolume = useMemo(
    () =>
      calculatePlannedFAUVolume(
        [...plannedExerciseDefinitions, ...selectedDefs],
        muscleBalanceSnapshot
      ),
    [plannedExerciseDefinitions, selectedDefs, muscleBalanceSnapshot]
  )

  const handleAddToggle = useCallback((def: ExerciseDefinition) => {
    setSelectedDefs((prev) =>
      prev.some((d) => d.id === def.id)
        ? prev.filter((d) => d.id !== def.id)
        : [...prev, def]
    )
  }, [])

  const handleSwapSelect = useCallback(
    (def: ExerciseDefinition) => {
      if (isBusy) return
      onConfirm([def])
    },
    [isBusy, onConfirm]
  )

  const count = selectedDefs.length
  const title = isAdd ? 'Search Exercises' : 'Swap Exercise'
  const description = isAdd
    ? 'Pick one or more to add to your workout'
    : `Pick a replacement for ${mode.kind === 'swap' ? mode.replacingName : ''}`

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        showClose={false}
        fullScreenMobile={true}
        // ExerciseSearchInterface auto-focuses search input; prevent Radix's
        // default open-focus so the mobile keyboard doesn't pop up (#846).
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-full h-full sm:w-[90vw] sm:max-w-3xl sm:h-auto sm:max-h-[85vh] rounded-none sm:rounded-none border border-border bg-card"
      >
        <DialogHeader className="border-b border-border bg-primary py-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold text-primary-foreground tracking-wider uppercase">
                {title}
              </DialogTitle>
              <DialogDescription className="text-base font-bold text-primary-foreground/70 uppercase tracking-wide">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="flex-1 min-h-0">
          <ExerciseSearchInterface
            onExerciseSelect={isAdd ? handleAddToggle : handleSwapSelect}
            selectedIds={isAdd ? selectedIds : undefined}
            preloadExercises
            muscleBalanceSnapshot={isAdd ? muscleBalanceSnapshot : undefined}
            plannedFAUVolume={isAdd ? plannedFAUVolume : undefined}
          />
        </DialogBody>

        <DialogFooter className="border-t border-border bg-card py-2">
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={onClose} doom disabled={isBusy}>
              Cancel
            </Button>
            {isAdd && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateModal(true)}
                  doom
                  disabled={isBusy}
                >
                  + Create New Exercise
                </Button>
                <Button
                  variant="primary"
                  onClick={() => onConfirm(selectedDefs)}
                  disabled={count === 0 || isBusy}
                  loading={isBusy}
                  doom
                >
                  {count === 0 ? 'Add' : count === 1 ? 'Add 1 exercise' : `Add all (${count})`}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
      <ExerciseDefinitionEditorModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        mode="create"
        onSuccess={(newExercise) => {
          setShowCreateModal(false)
          // Auto-select the newly created exercise so the user can add it
          // straight away without having to re-find it in search results.
          const def: ExerciseDefinition = {
            id: newExercise.id,
            name: newExercise.name,
            primaryFAUs: newExercise.primaryFAUs,
            secondaryFAUs: newExercise.secondaryFAUs,
            equipment: newExercise.equipment,
            instructions: newExercise.instructions,
          }
          if (isAdd) {
            setSelectedDefs((prev) =>
              prev.some((d) => d.id === def.id) ? prev : [...prev, def]
            )
          } else {
            onConfirm([def])
          }
        }}
      />
    </Dialog>
  )
}

function calculatePlannedFAUVolume(
  definitions: Array<{ primaryFAUs: string[]; secondaryFAUs: string[] }>,
  snapshot: MuscleBalanceSnapshot
): Partial<Record<FAUKey, number>> {
  const volume = ALL_FAUS.reduce((acc, fau) => {
    acc[fau] = 0
    return acc
  }, {} as Record<FAUKey, number>)

  for (const definition of definitions) {
    for (const fau of definition.primaryFAUs) {
      if (isFAUKey(fau)) {
        volume[fau] += HYPOTHETICAL_SETS_PER_EXERCISE
      }
    }

    if (snapshot.settings.includeSecondary) {
      for (const fau of definition.secondaryFAUs) {
        if (isFAUKey(fau)) {
          volume[fau] +=
            HYPOTHETICAL_SETS_PER_EXERCISE * snapshot.settings.secondaryWeight
        }
      }
    }
  }

  return volume
}

function isFAUKey(value: string): value is FAUKey {
  return (ALL_FAUS as readonly string[]).includes(value)
}
