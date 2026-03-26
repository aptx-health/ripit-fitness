'use client'

import { useEffect, useState } from 'react'
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
}

type ExpandedInput = 'weight' | 'rpe' | 'rir' | null

export default function SetLoggingForm({
  prescribedSet,
  hasLoggedAllPrescribed,
  hasRpe,
  hasRir,
  currentSet,
  onSetChange,
}: SetLoggingFormProps) {
  const { settings } = useUserSettings()
  const [expandedInput, setExpandedInput] = useState<ExpandedInput>(null)

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
    setExpandedInput(input)
  }

  const handleCollapse = () => {
    setExpandedInput(null)
  }

  const showReps = expandedInput === null || expandedInput === 'weight'
  const showWeight = true // always visible, either compact or expanded
  const showIntensity = expandedInput === null || expandedInput === 'rpe' || expandedInput === 'rir'

  return (
    <div className="flex-shrink-0">
      <div className="space-y-3">
        {/* Reps stepper - always visible when no input is expanded, hidden when intensity is expanded */}
        {showReps && (
          <RepsStepper
            value={currentSet.reps}
            onChange={(val) => onSetChange({ ...currentSet, reps: val })}
            placeholder={prescribedSet?.reps?.toString()}
          />
        )}

        {/* Weight keypad - always visible (compact or expanded) */}
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

        {/* Intensity selectors - only when exercise uses them */}
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
      </div>
    </div>
  )
}
