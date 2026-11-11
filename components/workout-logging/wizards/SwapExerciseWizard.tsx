'use client'

import { ChevronLeft } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExerciseSearchInterface } from '@/components/exercise-selection/ExerciseSearchInterface'
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
import { clientLogger } from '@/lib/client-logger'
import type { ExerciseDefinition } from '../wizard-steps/ExerciseSearchStep'
import {
  type ExercisePrescription,
  SetConfigurationStep,
} from '../wizard-steps/SetConfigurationStep'

export type SwapPrescribedSet = {
  setNumber: number
  reps: string
  rir?: number | null
  rpe?: number | null
  weight?: string | null
}

interface SwapExerciseWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentExerciseId: string
  currentExerciseName: string
  currentExerciseDefinitionId: string
  currentPrescribedSets: SwapPrescribedSet[]
  onComplete: () => Promise<void>
}

const SWAP_FAILED = "Swap didn't happen. Try again."

/**
 * Program logger swap: opens on the picker (Similar list, then search). With
 * "Keep original sets" checked a tap swaps at once and keeps the prescribed
 * sets; unchecked, the tap opens the set editor prefilled with them.
 */
export function SwapExerciseWizard({
  open,
  onOpenChange,
  currentExerciseId,
  currentExerciseName,
  currentExerciseDefinitionId,
  currentPrescribedSets,
  onComplete,
}: SwapExerciseWizardProps) {
  const [keepSets, setKeepSets] = useState(true)
  const [applyToFuture, setApplyToFuture] = useState(false)
  // Set when "Keep original sets" is off: the set editor is showing for this pick.
  const [configuring, setConfiguring] = useState<ExerciseDefinition | null>(null)
  const [prescription, setPrescription] = useState<ExercisePrescription | null>(null)
  const [isSwapping, setIsSwapping] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Guards double taps before the isSwapping render lands.
  const swappingRef = useRef(false)

  // Reset wizard state when opened
  useEffect(() => {
    if (open) {
      setKeepSets(true)
      setApplyToFuture(false)
      setConfiguring(null)
      setPrescription(null)
      setIsSwapping(false)
      setErrorMessage(null)
      swappingRef.current = false
    }
  }, [open])

  // Memoized so SetConfigurationInterface's effect doesn't reset on re-render.
  const initialConfig = useMemo(() => {
    const firstSet = currentPrescribedSets[0]
    const intensityType: 'RIR' | 'RPE' | 'NONE' =
      firstSet?.rpe !== null && firstSet?.rpe !== undefined ? 'RPE'
      : firstSet?.rir !== null && firstSet?.rir !== undefined ? 'RIR'
      : 'NONE'
    return {
      setCount: currentPrescribedSets.length,
      intensityType,
      notes: '',
      sets: currentPrescribedSets.map((set) => ({
        setNumber: set.setNumber,
        reps: set.reps,
        intensityValue:
          intensityType === 'RPE' ? set.rpe ?? undefined
          : intensityType === 'RIR' ? set.rir ?? undefined
          : undefined,
      })),
    }
  }, [currentPrescribedSets])

  const summary = useMemo(() => describePrescription(currentPrescribedSets), [currentPrescribedSets])

  const swap = useCallback(
    async (exercise: ExerciseDefinition, edited?: ExercisePrescription) => {
      if (swappingRef.current) return
      swappingRef.current = true
      setIsSwapping(true)
      setErrorMessage(null)

      try {
        // Without prescribedSets the route keeps each exercise's own sets.
        const response = await fetch(`/api/exercises/${currentExerciseId}/replace`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newExerciseDefinitionId: exercise.id,
            applyToFuture,
            ...(edited && { prescribedSets: edited.sets, notes: edited.notes }),
          }),
        })
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to replace exercise')
        }
      } catch (error) {
        clientLogger.error('Error replacing exercise:', error)
        setErrorMessage(SWAP_FAILED)
        setIsSwapping(false)
        swappingRef.current = false
        return
      }

      // The swap landed; a failed refresh shouldn't read as a failed swap.
      try {
        await onComplete()
      } catch (error) {
        clientLogger.error('Error refreshing workout after swap:', error)
      }
      onOpenChange(false)
    },
    [applyToFuture, currentExerciseId, onComplete, onOpenChange]
  )

  const handleExerciseSelect = useCallback(
    (exercise: ExerciseDefinition) => {
      if (keepSets) {
        swap(exercise)
        return
      }
      setErrorMessage(null)
      setPrescription(null)
      setConfiguring(exercise)
    },
    [keepSets, swap]
  )

  const handleSaveEdited = useCallback(() => {
    if (!configuring) return
    if (!prescription || prescription.sets.length === 0) {
      setErrorMessage('Add at least one set.')
      return
    }
    swap(configuring, prescription)
  }, [configuring, prescription, swap])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        fullScreenMobile={true}
        // The picker opens on a search input; prevent Radix auto-focus so the
        // mobile keyboard doesn't pop up automatically (issue #846).
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-full h-full sm:w-[90vw] sm:max-w-3xl sm:h-auto sm:max-h-[85vh] rounded-none sm:rounded-none border border-border bg-card"
      >
        <DialogHeader className="border-b border-border bg-primary py-2">
          <DialogTitle className="text-lg font-bold text-primary-foreground tracking-wider uppercase">
            {configuring ? 'Set up sets' : 'Swap Exercise'}
          </DialogTitle>
          <DialogDescription className="text-base font-bold text-primary-foreground/70 uppercase tracking-wide">
            {configuring ? configuring.name : `Replace "${currentExerciseName}"`}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <p role="alert" className="border-b-2 border-error bg-error-muted px-4 py-2 text-sm font-bold text-error">
            {errorMessage}
          </p>
        )}

        <DialogBody className="flex-1 min-h-0">
          {configuring ? (
            <SetConfigurationStep
              exercise={configuring}
              initialConfig={initialConfig}
              onConfigChange={setPrescription}
            />
          ) : (
            <div className="flex flex-col h-full w-full overflow-hidden">
              <div className="flex flex-col gap-2 border-b-2 border-border px-4 sm:px-6 py-3 flex-shrink-0">
                <label className="flex min-h-10 items-center gap-3 text-foreground">
                  <input
                    type="checkbox"
                    checked={keepSets}
                    onChange={(e) => setKeepSets(e.target.checked)}
                    disabled={isSwapping}
                    className="accent-primary w-5 h-5"
                  />
                  <span className="font-bold">Keep original sets</span>
                  {summary && <span className="ml-auto text-sm text-muted-foreground">{summary}</span>}
                </label>
                <label className="flex min-h-10 items-center gap-3 text-foreground">
                  <input
                    type="checkbox"
                    checked={applyToFuture}
                    onChange={(e) => setApplyToFuture(e.target.checked)}
                    disabled={isSwapping}
                    className="accent-primary w-5 h-5"
                  />
                  <span className="font-bold">Also swap in future weeks</span>
                </label>
              </div>
              <div className={`flex flex-col flex-1 min-h-0 ${isSwapping ? 'pointer-events-none opacity-60' : ''}`}>
                <ExerciseSearchInterface
                  onExerciseSelect={handleExerciseSelect}
                  preloadExercises
                  similarToDefinitionId={currentExerciseDefinitionId || undefined}
                />
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="border-t border-border bg-card py-2">
          <div className="flex items-center justify-between w-full">
            <div>
              {configuring && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConfiguring(null)
                    setErrorMessage(null)
                  }}
                  disabled={isSwapping}
                  doom
                >
                  <ChevronLeft className="w-4 h-4 mr-1 inline" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isSwapping && !configuring && (
                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Swapping...</span>
              )}
              <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSwapping} doom>
                Cancel
              </Button>
              {configuring && (
                <Button variant="primary" onClick={handleSaveEdited} disabled={isSwapping} loading={isSwapping} doom>
                  Swap exercise
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** "3 × 8 @ RIR 2" when every set matches; otherwise just the set count. */
function describePrescription(sets: SwapPrescribedSet[]): string {
  if (sets.length === 0) return ''
  const first = sets[0]
  const same = sets.every((s) => s.reps === first.reps && (s.rir ?? null) === (first.rir ?? null) && (s.rpe ?? null) === (first.rpe ?? null))
  if (!same) return `${sets.length} sets`
  const intensity =
    first.rpe !== null && first.rpe !== undefined ? ` @ RPE ${first.rpe}`
    : first.rir !== null && first.rir !== undefined ? ` @ RIR ${first.rir}`
    : ''
  return `${sets.length} × ${first.reps}${intensity}`
}
