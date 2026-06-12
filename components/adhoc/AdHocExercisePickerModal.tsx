'use client'

import { Sparkles } from 'lucide-react'
import Link from 'next/link'
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
import { TipAnnotation } from '@/components/ui/TipAnnotation'
import type { FAUKey } from '@/lib/fau-volume'

export type PickerMode =
  | { kind: 'add'; initialFau?: FAUKey }
  | { kind: 'swap'; replacingName: string; targetId?: string }

export function AdHocEmptyState({
  muscleBalanceSnapshot,
  onSelectFAU,
}: {
  muscleBalanceSnapshot: MuscleBalanceSnapshot
  onSelectFAU: (fau: FAUKey) => void
}) {
  const [balanceOpen, setBalanceOpen] = useState(false)
  const topNeglected = muscleBalanceSnapshot.neglected.slice(0, 3)
  const neglectedLabel =
    topNeglected.length > 0
      ? topNeglected.map((item) => item.label).join(', ')
      : 'No clear laggards yet'

  return (
    <div className="flex-1 overflow-auto px-5 py-6">
      <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-5">
        <div className="flex min-h-[34vh] items-center">
          <TipAnnotation
            icon={<Sparkles aria-hidden="true" size={20} strokeWidth={1.8} />}
          >
            <span className="text-2xl sm:text-3xl leading-relaxed text-foreground">
              Pick your first exercise to start logging. Add as many as you want as you go.
            </span>
          </TipAnnotation>
        </div>

        <section className="border-t-2 border-border pt-4">
          <button
            type="button"
            onClick={() => setBalanceOpen((open) => !open)}
            className="flex min-h-12 w-full items-center justify-between gap-3 text-left doom-focus-ring"
            aria-expanded={balanceOpen}
          >
            <span>
              <span className="block text-lg font-bold uppercase tracking-wider text-accent sm:text-xl">
                Muscle Balance
              </span>
              <span className="block text-sm text-muted-foreground">
                Suggested focus: {neglectedLabel}
              </span>
            </span>
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {balanceOpen ? 'Hide' : 'Show'}
            </span>
          </button>

          <p className="mt-3 text-sm text-muted-foreground">
            Edit targets in{' '}
            <Link
              href="/settings/muscle-balance"
              className="font-bold uppercase tracking-wider text-foreground underline decoration-border underline-offset-4 doom-focus-ring hover:text-primary"
            >
              Settings &gt; Muscle Balance
            </Link>
            .
          </p>

          {balanceOpen && (
            <div className="mt-4">
              <MuscleBalancePanel
                snapshot={muscleBalanceSnapshot}
                compact
                onSelectFAU={onSelectFAU}
              />
            </div>
          )}
        </section>
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
}

export function AdHocExercisePickerModal({
  mode,
  onClose,
  onConfirm,
  isBusy,
  muscleBalanceSnapshot,
}: Props) {
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
