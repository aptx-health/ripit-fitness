'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useUserSettings } from '@/hooks/useUserSettings'
import { IntensitySelector } from './inputs/IntensitySelector'
import { RepsStepper } from './inputs/RepsStepper'
import { WeightKeypad } from './inputs/WeightKeypad'

interface PrescribedSet {
  id: string
  setNumber: number
  reps: string
  weight: string | null
  rpe: number | null
  rir: number | null
}

export type ExpandedInput = 'weight' | 'rpe' | 'rir' | null

interface SetLoggingFormProps {
  prescribedSet: PrescribedSet | undefined
  hasLoggedAllPrescribed: boolean
  extraSetsMode: boolean
  hasRpe: boolean
  hasRir: boolean
  currentSet: {
    reps: string
    weight: string
    weightUnit: 'lbs' | 'kg'
    rpe: string
    rir: string
  }
  onSetChange: (setData: {
    reps: string
    weight: string
    weightUnit: 'lbs' | 'kg'
    rpe: string
    rir: string
  }) => void
  expandedInput: ExpandedInput
  onExpandedInputChange: (input: ExpandedInput) => void
  onExtraSets: () => void
  onNextExercise: () => void
  onCompleteWorkout?: () => void
  isLastExercise: boolean
}

export default function SetLoggingForm({
  prescribedSet,
  hasLoggedAllPrescribed,
  extraSetsMode,
  hasRpe,
  hasRir,
  currentSet,
  onSetChange,
  expandedInput,
  onExpandedInputChange,
  onExtraSets,
  onNextExercise,
  onCompleteWorkout,
  isLastExercise,
}: SetLoggingFormProps) {
  const { settings } = useUserSettings()

  // Update weight unit when settings change
  useEffect(() => {
    if (settings?.defaultWeightUnit && currentSet.weightUnit !== settings.defaultWeightUnit) {
      onSetChange({
        ...currentSet,
        weightUnit: settings.defaultWeightUnit,
      })
    }
  }, [settings?.defaultWeightUnit, currentSet, onSetChange])

  // Capture the value before expansion so cancel can restore it
  const valueBeforeExpand = useRef<string>('')

  const handleExpand = useCallback((input: ExpandedInput) => {
    if (input === 'weight') valueBeforeExpand.current = currentSet.weight
    else if (input === 'rpe') valueBeforeExpand.current = currentSet.rpe
    else if (input === 'rir') valueBeforeExpand.current = currentSet.rir
    onExpandedInputChange(input)
  }, [currentSet.weight, currentSet.rpe, currentSet.rir, onExpandedInputChange])

  const handleCollapse = useCallback(() => {
    onExpandedInputChange(null)
  }, [onExpandedInputChange])

  const handleCancel = useCallback((input: ExpandedInput) => {
    // Restore the value from before expansion
    const restored = valueBeforeExpand.current
    if (input === 'weight') onSetChange({ ...currentSet, weight: restored })
    else if (input === 'rpe') onSetChange({ ...currentSet, rpe: restored })
    else if (input === 'rir') onSetChange({ ...currentSet, rir: restored })
    onExpandedInputChange(null)
  }, [currentSet, onSetChange, onExpandedInputChange])

  if (hasLoggedAllPrescribed && !extraSetsMode) {
    return (
      <div className="bg-success-muted border-2 border-success-border p-4 flex-shrink-0">
        <div className="text-success-text font-bold mb-3 uppercase tracking-wider text-center">
          All prescribed sets logged!
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onExtraSets}
            className="flex-1 py-2.5 bg-accent text-accent-foreground text-sm font-bold uppercase tracking-wider transition-all hover:bg-accent/90 doom-button-3d doom-focus-ring"
          >
            Extra Sets
          </button>
          {isLastExercise ? (
            <button
              type="button"
              onClick={onCompleteWorkout}
              className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider transition-all hover:bg-primary/90 doom-button-3d doom-focus-ring"
            >
              Complete Workout
            </button>
          ) : (
            <button
              type="button"
              onClick={onNextExercise}
              className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider transition-all hover:bg-primary/90 doom-button-3d doom-focus-ring"
            >
              Next Exercise
            </button>
          )}
        </div>
      </div>
    )
  }

  const showReps = expandedInput === null
  const showWeight = expandedInput === null || expandedInput === 'weight'
  const showIntensity = expandedInput === null || expandedInput === 'rpe' || expandedInput === 'rir'

  return (
    <div className={expandedInput !== null ? 'flex-1 flex flex-col' : 'flex-shrink-0'}>
      <div className={expandedInput !== null ? 'flex-1 flex flex-col' : 'space-y-2'}>
        {/* Reps stepper - always visible when no input is expanded, hidden when intensity is expanded */}
        {showReps && (
          <RepsStepper
            value={currentSet.reps}
            onChange={(val) => onSetChange({ ...currentSet, reps: val })}
            placeholder={prescribedSet?.reps?.toString()}
          />
        )}

        {/* Weight + Intensity: side by side when compact, stacked when expanded */}
        {expandedInput === null && (hasRir || hasRpe) ? (
          <div className="flex gap-3">
            <div className="flex-1">
              <WeightKeypad
                value={currentSet.weight}
                weightUnit={currentSet.weightUnit}
                onChange={(val) => onSetChange({ ...currentSet, weight: val })}
                isExpanded={false}
                onExpand={() => handleExpand('weight')}
                onCollapse={handleCollapse}
                onCancel={() => handleCancel('weight')}
              />
            </div>
            <div className="flex-1">
              {hasRir && (
                <IntensitySelector
                  type="rir"
                  value={currentSet.rir}
                  onChange={(val) => onSetChange({ ...currentSet, rir: val })}
                  prescribedValue={prescribedSet?.rir}
                  isExpanded={false}
                  onExpand={() => handleExpand('rir')}
                  onCollapse={handleCollapse}
                  onCancel={() => handleCancel('rir')}
                />
              )}
              {hasRpe && (
                <IntensitySelector
                  type="rpe"
                  value={currentSet.rpe}
                  onChange={(val) => onSetChange({ ...currentSet, rpe: val })}
                  prescribedValue={prescribedSet?.rpe}
                  isExpanded={false}
                  onExpand={() => handleExpand('rpe')}
                  onCollapse={handleCollapse}
                  onCancel={() => handleCancel('rpe')}
                />
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Weight keypad - full width when expanded or no intensity */}
            {showWeight && (
              <WeightKeypad
                value={currentSet.weight}
                weightUnit={currentSet.weightUnit}
                onChange={(val) => onSetChange({ ...currentSet, weight: val })}
                isExpanded={expandedInput === 'weight'}
                onExpand={() => handleExpand('weight')}
                onCollapse={handleCollapse}
                onCancel={() => handleCancel('weight')}
              />
            )}

            {/* Intensity selectors - full width when expanded */}
            {showIntensity && hasRir && (
              <IntensitySelector
                type="rir"
                value={currentSet.rir}
                onChange={(val) => onSetChange({ ...currentSet, rir: val })}
                prescribedValue={prescribedSet?.rir}
                isExpanded={expandedInput === 'rir'}
                onExpand={() => handleExpand('rir')}
                onCollapse={handleCollapse}
                onCancel={() => handleCancel('rir')}
              />
            )}

            {showIntensity && hasRpe && (
              <IntensitySelector
                type="rpe"
                value={currentSet.rpe}
                onChange={(val) => onSetChange({ ...currentSet, rpe: val })}
                prescribedValue={prescribedSet?.rpe}
                isExpanded={expandedInput === 'rpe'}
                onExpand={() => handleExpand('rpe')}
                onCollapse={handleCollapse}
                onCancel={() => handleCancel('rpe')}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
