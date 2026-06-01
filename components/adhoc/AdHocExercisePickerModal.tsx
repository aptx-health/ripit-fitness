'use client'

import { Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'
import {
  type ExerciseDefinition,
  ExerciseSearchInterface,
} from '@/components/exercise-selection/ExerciseSearchInterface'
import ExerciseDefinitionEditorModal from '@/components/features/exercise-definition/ExerciseDefinitionEditorModal'
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

export type PickerMode =
  | { kind: 'add' }
  | { kind: 'swap'; replacingName: string; targetId?: string }

export function AdHocEmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-8">
      <TipAnnotation
        icon={<Sparkles aria-hidden="true" size={20} strokeWidth={1.8} />}
      >
        <span className="text-xl sm:text-2xl leading-relaxed text-foreground">
          Pick your first exercise to start logging. Add as many as you want as you go.
        </span>
      </TipAnnotation>
    </div>
  )
}

type Props = {
  mode: PickerMode
  onClose: () => void
  onConfirm: (defs: ExerciseDefinition[]) => void
  isBusy: boolean
}

export function AdHocExercisePickerModal({ mode, onClose, onConfirm, isBusy }: Props) {
  const isAdd = mode.kind === 'add'
  const [selectedDefs, setSelectedDefs] = useState<ExerciseDefinition[]>([])
  const selectedIds = new Set(selectedDefs.map((d) => d.id))
  const [showCreateModal, setShowCreateModal] = useState(false)

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
