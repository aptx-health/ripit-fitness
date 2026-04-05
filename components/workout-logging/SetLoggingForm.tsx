'use client'

import { useEffect } from 'react'
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
}

export default function SetLoggingForm({
  prescribedSet,
  hasLoggedAllPrescribed,
  hasRpe,
  hasRir,
  currentSet,
  onSetChange,
  expandedInput,
  onExpandedInputChange,
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

  if (hasLoggedAllPrescribed) {
    return (
      <div className="bg-success-muted border-2 border-success-border p-4 text-center flex-shrink-0">
        <div className="text-success-text font-bold mb-2 uppercase tracking-wider">
          All prescribed sets logged!
        </div>
        <p className="text-sm text-success-text">
          Continue to next exercise or complete workout
        </p>
      </div>
    )
  }

  const handleExpand = (input: ExpandedInput) => {
    onExpandedInputChange(input)
  }

  const handleCollapse = () => {
    onExpandedInputChange(null)
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
            prescribedReps={prescribedSet?.reps?.toString()}
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
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
