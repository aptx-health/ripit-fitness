'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DemographicsStep } from './steps/DemographicsStep'
import { GoalsStep } from './steps/GoalsStep'
import { InjuriesStep } from './steps/InjuriesStep'
import { RhythmStep } from './steps/RhythmStep'
import { WIZARD_STEPS, type WizardAnswers } from './types'
import { useGoalsWizardDraft } from './useGoalsWizardDraft'

export function GoalsWizard({
  userId,
  initialAnswers,
  doneHref = '/settings',
}: {
  userId: string
  initialAnswers: WizardAnswers
  doneHref?: string
}) {
  const router = useRouter()
  const {
    answers,
    stepIndex,
    saveState,
    hydrated,
    patchLocal,
    saveStep,
    goToStep,
    clearDraft,
  } = useGoalsWizardDraft(userId, initialAnswers)
  const [error, setError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)

  const step = WIZARD_STEPS[stepIndex]
  const isLast = stepIndex === WIZARD_STEPS.length - 1
  const saving = saveState === 'saving' || finishing

  const advance = async () => {
    setError(null)
    const nextIndex = isLast ? stepIndex : stepIndex + 1
    const ok = await saveStep(step.id, nextIndex)
    if (!ok) {
      setError("Couldn't save that just now. Check your connection and try again.")
      return
    }
    if (isLast) {
      setFinishing(true)
      clearDraft()
      router.push(doneHref)
      router.refresh()
    } else {
      goToStep(nextIndex)
      window.scrollTo({ top: 0 })
    }
  }

  const back = () => {
    setError(null)
    if (stepIndex > 0) {
      goToStep(stepIndex - 1)
      window.scrollTo({ top: 0 })
    } else {
      router.push(doneHref)
    }
  }

  // Avoid a flash of step 1 before the resume position hydrates.
  if (!hydrated) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {/* Progress segments */}
      <div
        className="flex gap-[3px] px-5 pt-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        {WIZARD_STEPS.map((s, i) => (
          <div
            key={s.id}
            className="h-[5px] flex-1"
            style={{
              backgroundColor: i <= stepIndex ? 'var(--success)' : 'var(--muted)',
            }}
          />
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5">
        {/* Header */}
        <div className="pt-6">
          <button
            type="button"
            onClick={back}
            className="mb-5 flex min-h-11 items-center self-start border-none bg-transparent p-0 text-[13px] font-medium uppercase tracking-wider text-muted-foreground"
            aria-label={stepIndex > 0 ? 'Previous step' : 'Exit wizard'}
          >
            &larr; {stepIndex > 0 ? 'Back' : 'Exit'}
          </button>
          <p className="mb-1 text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
            Step {stepIndex + 1} of {WIZARD_STEPS.length}
          </p>
          <h1 className="mb-2 text-[26px] font-semibold leading-tight text-foreground">
            {step.title}
          </h1>
          <p className="mb-7 text-[15px] leading-relaxed text-muted-foreground">
            {step.blurb}
          </p>
        </div>

        {/* Step body */}
        <div className="flex-1 pb-40">
          {step.id === 'goals' && (
            <GoalsStep answers={answers} patchLocal={patchLocal} />
          )}
          {step.id === 'rhythm' && (
            <RhythmStep answers={answers} patchLocal={patchLocal} />
          )}
          {step.id === 'injuries' && (
            <InjuriesStep answers={answers} patchLocal={patchLocal} />
          )}
          {step.id === 'demographics' && (
            <DemographicsStep answers={answers} patchLocal={patchLocal} />
          )}
        </div>
      </div>

      {/* Sticky footer actions */}
      <div
        className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="mx-auto w-full max-w-lg px-5 pt-3">
          {error && (
            <div className="mb-3 border border-error/30 bg-error/10 px-4 py-2 text-sm text-error-text">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={advance}
            disabled={saving}
            className="w-full min-h-12 bg-success text-sm font-medium uppercase tracking-widest text-success-foreground doom-focus-ring disabled:opacity-60"
          >
            {saving
              ? 'Saving...'
              : isLast
                ? 'Finish'
                : 'Continue'}
          </button>
          {!isLast && (
            <button
              type="button"
              onClick={advance}
              disabled={saving}
              className="mt-2 min-h-11 w-full border-none bg-transparent text-[13px] font-medium uppercase tracking-wider text-muted-foreground disabled:opacity-60"
            >
              Skip this step
            </button>
          )}
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-h-[100svh] flex-col bg-background">
      {children}
    </div>
  )
}
