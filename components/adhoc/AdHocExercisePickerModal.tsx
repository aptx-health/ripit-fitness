'use client'

import { useCallback, useState } from 'react'
import {
  type ExerciseDefinition,
  ExerciseSearchInterface,
} from '@/components/exercise-selection/ExerciseSearchInterface'
import ExerciseDefinitionEditorModal from '@/components/features/exercise-definition/ExerciseDefinitionEditorModal'
import MuscleBalancePanel from '@/components/features/muscle-balance/MuscleBalancePanel'
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
import type { FAUKey } from '@/lib/fau-volume'

export type PickerMode =
  | { kind: 'add'; initialFau?: FAUKey }
  | { kind: 'swap'; replacingName: string }

export default function AdHocExercisePickerModal({
  mode,
  onClose,
  onConfirm,
  isBusy,
  muscleBalanceSnapshot,
}: {
  mode: PickerMode
  onClose: () => void
  onConfirm: (defs: ExerciseDefinition[]) => void
  isBusy: boolean
  muscleBalanceSnapshot: MuscleBalanceSnapshot
}) {
  const isAdd = mode.kind === 'add'
  const [selectedDefs, setSelectedDefs] = useState<ExerciseDefinition[]>([])
  const selectedIds = new Set(selectedDefs.map((d) => d.id))
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [balanceOpen, setBalanceOpen] = useState(isAdd && !!mode.initialFau)
  const [activeFau, setActiveFau] = useState<FAUKey | null>(
    mode.kind === 'add' ? mode.initialFau ?? null : null
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
          {isAdd && (
            <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setBalanceOpen((value) => !value)}
                className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-bold uppercase tracking-wider text-foreground doom-focus-ring"
              >
                <span>Muscle Balance</span>
                <span className="text-sm text-muted-foreground">
                  {balanceOpen ? 'Hide' : 'Show'}
                </span>
              </button>
              {balanceOpen && (
                <div className="mt-3">
                  <MuscleBalancePanel
                    snapshot={muscleBalanceSnapshot}
                    compact
                    onSelectFAU={(fau) => {
                      setActiveFau(fau)
                      setBalanceOpen(false)
                    }}
                  />
                </div>
              )}
            </div>
          )}
          <ExerciseSearchInterface
            key={activeFau ?? 'all'}
            onExerciseSelect={isAdd ? handleAddToggle : handleSwapSelect}
            selectedIds={isAdd ? selectedIds : undefined}
            preloadExercises
            initialFauFilter={activeFau}
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
