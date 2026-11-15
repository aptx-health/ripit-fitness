'use client'

import { useState } from 'react'
import { type ExerciseDefinition, ExerciseSearchInterface } from '@/components/exercise-selection/ExerciseSearchInterface'
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
import type { BundledExercise } from '@/lib/suggestions/types'

/** The trainee's pick for one bundled exercise; "mine" has no exercise until they choose one. */
export type BundledChoice = { use: 'copy' } | { use: 'mine'; exerciseDefinitionId?: string; name?: string }

/**
 * A coach send's custom exercises, one group each: add a copy (the default,
 * reusing an earlier copy when there is one) or use one of the trainee's own
 * or a shared exercise, picked with the usual exercise search.
 */
export default function BundledExerciseChoices({
  exercises,
  coachName,
  choices,
  onChange,
  disabled,
}: {
  exercises: BundledExercise[]
  coachName: string
  choices: Record<string, BundledChoice>
  onChange: (sourceId: string, choice: BundledChoice) => void
  disabled: boolean
}) {
  const [picking, setPicking] = useState<BundledExercise | null>(null)

  const choiceOf = (sourceId: string): BundledChoice => choices[sourceId] ?? { use: 'copy' }

  const chooseMine = (exercise: BundledExercise) => {
    const current = choiceOf(exercise.sourceId)
    onChange(exercise.sourceId, current.use === 'mine' ? current : { use: 'mine' })
    if (current.use !== 'mine' || !current.exerciseDefinitionId) setPicking(exercise)
  }

  const pick = (definition: ExerciseDefinition) => {
    if (!picking) return
    onChange(picking.sourceId, { use: 'mine', exerciseDefinitionId: definition.id, name: definition.name })
    setPicking(null)
  }

  // Closing the search without a pick goes back to a copy.
  const closePicker = () => {
    if (picking) {
      const current = choiceOf(picking.sourceId)
      if (current.use === 'mine' && !current.exerciseDefinitionId) onChange(picking.sourceId, { use: 'copy' })
    }
    setPicking(null)
  }

  return (
    <section className="space-y-1.5">
      <h2 className="doom-label text-secondary">Exercises from {coachName}</h2>
      <p className="text-sm text-muted-foreground">
        {coachName} made {exercises.length === 1 ? 'this exercise' : 'these exercises'}. Add a copy to your exercises, or
        use one you already have.
      </p>
      <div className="space-y-3">
        {exercises.map((exercise) => {
          const choice = choiceOf(exercise.sourceId)
          const group = `bundled-${exercise.sourceId}`
          return (
            <fieldset key={exercise.sourceId} className="border-2 border-border bg-card p-3 space-y-2 min-w-0">
              {/* The legend names the group for screen readers; a long name in a legend straddles the border. */}
              <legend className="sr-only">{exercise.name}</legend>
              <div>
                <p aria-hidden="true" className="text-sm font-bold text-foreground break-words">
                  {exercise.name}
                </p>
                <p className="text-xs text-muted-foreground break-words">{coachName}&apos;s exercise</p>
              </div>
              <label className="flex items-start gap-3 min-h-11 py-1 cursor-pointer">
                <input
                  type="radio"
                  name={group}
                  checked={choice.use === 'copy'}
                  onChange={() => onChange(exercise.sourceId, { use: 'copy' })}
                  disabled={disabled}
                  aria-describedby={`${group}-copy`}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">Add a copy</span>
                  <span id={`${group}-copy`} className="block text-xs text-muted-foreground break-words">
                    {exercise.earlierCopy
                      ? `You have this from an earlier send: ${exercise.earlierCopy}`
                      : exercise.copyName
                        ? `Adds "${exercise.copyName}" to your exercises; you can rename it.`
                        : 'Adds a copy to your exercises; you can rename it.'}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 min-h-11 py-1 cursor-pointer">
                <input
                  type="radio"
                  name={group}
                  checked={choice.use === 'mine'}
                  onChange={() => chooseMine(exercise)}
                  disabled={disabled}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span className="block text-sm font-semibold text-foreground">Use one of mine</span>
              </label>
              {choice.use === 'mine' && (
                <div className="flex items-center justify-between gap-3 border-t border-border pt-2 pl-7">
                  <span className="min-w-0 text-sm text-foreground break-words">
                    {choice.name ?? <span className="text-muted-foreground">Nothing picked yet</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPicking(exercise)}
                    disabled={disabled}
                    className="shrink-0 min-h-11 px-3 text-xs font-bold uppercase tracking-wider text-primary doom-focus-ring"
                  >
                    {choice.name ? 'Change' : 'Pick'}
                  </button>
                </div>
              )}
            </fieldset>
          )
        })}
      </div>

      <Dialog open={picking !== null} onOpenChange={(open) => !open && closePicker()}>
        <DialogContent
          showClose={false}
          fullScreenMobile={true}
          // Don't pop the mobile keyboard on open (#846).
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-full h-full sm:w-[90vw] sm:max-w-3xl sm:h-auto sm:max-h-[85vh] rounded-none sm:rounded-none border border-border bg-card"
        >
          <DialogHeader className="border-b border-border bg-primary py-2">
            <DialogTitle className="text-lg font-bold text-primary-foreground tracking-wider uppercase">
              Use one of mine
            </DialogTitle>
            <DialogDescription className="text-base font-bold text-primary-foreground/70 uppercase tracking-wide break-words">
              Instead of {picking?.name}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex-1 min-h-0">
            {picking && <ExerciseSearchInterface onExerciseSelect={pick} />}
          </DialogBody>
          <DialogFooter className="border-t border-border bg-card py-2">
            <div className="flex items-center justify-end w-full">
              <Button variant="secondary" onClick={closePicker} doom>
                Cancel
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
