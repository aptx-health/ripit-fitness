'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, PlusCircle, MinusCircle } from 'lucide-react'
import { useUserSettings } from '@/hooks/useUserSettings'
import type { ExerciseDefinition } from './ExerciseSearchStep'

export type ExercisePrescription = {
  sets: Array<{
    setNumber: number
    reps: string
    intensityType: 'RIR' | 'RPE' | 'NONE'
    intensityValue?: number
  }>
  notes?: string
}

interface SetConfigurationStepProps {
  exercise: ExerciseDefinition
  initialConfig?: {
    setCount: number
    intensityType: 'RIR' | 'RPE' | 'NONE'
    notes: string
    sets: Array<{
      id?: string
      setNumber: number
      reps: string
      intensityValue?: number
    }>
  }
  onConfigChange: (config: ExercisePrescription) => void
  onDuplicateSet?: (setId: string) => Promise<void>
}

const FAU_DISPLAY_NAMES: Record<string, string> = {
  chest: 'Chest',
  'mid-back': 'Mid Back',
  'lower-back': 'Lower Back',
  'front-delts': 'Front Delts',
  'side-delts': 'Side Delts',
  'rear-delts': 'Rear Delts',
  lats: 'Lats',
  traps: 'Traps',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  adductors: 'Adductors',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  obliques: 'Obliques',
}

export function SetConfigurationStep({
  exercise,
  initialConfig,
  onConfigChange,
  onDuplicateSet,
}: SetConfigurationStepProps) {
  const { settings } = useUserSettings()

  // Determine default intensity type from UserSettings
  const getDefaultIntensityType = (): 'RIR' | 'RPE' | 'NONE' => {
    if (initialConfig) return initialConfig.intensityType

    if (!settings?.defaultIntensityRating) return 'NONE'

    return settings.defaultIntensityRating === 'rpe'
      ? 'RPE'
      : settings.defaultIntensityRating === 'rir'
      ? 'RIR'
      : 'NONE'
  }

  const [exerciseIntensityType, setExerciseIntensityType] = useState<'RIR' | 'RPE' | 'NONE'>(
    getDefaultIntensityType()
  )
  const [exerciseNotes, setExerciseNotes] = useState(initialConfig?.notes || '')
  const [sets, setSets] = useState<
    Array<{
      id?: string
      setNumber: number
      reps: string
      intensityValue?: number
    }>
  >(
    initialConfig?.sets || [
      { setNumber: 1, reps: '8-12' },
      { setNumber: 2, reps: '8-12' },
      { setNumber: 3, reps: '8-12' },
    ]
  )

  const [duplicatingSetId, setDuplicatingSetId] = useState<string | null>(null)

  // Update config whenever form state changes
  useEffect(() => {
    const prescription: ExercisePrescription = {
      sets: sets.map((set) => ({
        setNumber: set.setNumber,
        reps: set.reps,
        intensityType: exerciseIntensityType,
        intensityValue: exerciseIntensityType === 'NONE' ? undefined : set.intensityValue,
      })),
      notes: exerciseNotes.trim() || undefined,
    }
    onConfigChange(prescription)
  }, [sets, exerciseIntensityType, exerciseNotes, onConfigChange])

  const handleAddSet = useCallback(() => {
    setSets((prev) => {
      // Duplicate the last set's configuration
      const lastSet = prev[prev.length - 1]
      const newSet = {
        setNumber: prev.length + 1,
        reps: lastSet.reps,
        intensityValue: lastSet.intensityValue,
      }
      return [...prev, newSet]
    })
  }, [])

  const handleRemoveSet = useCallback(() => {
    setSets((prev) => {
      // Keep at least 1 set
      if (prev.length <= 1) return prev
      // Remove the last set
      return prev.slice(0, -1)
    })
  }, [])

  const handleSetUpdate = useCallback(
    (setIndex: number, field: 'reps' | 'intensityValue', value: string | number | undefined) => {
      setSets((prev) =>
        prev.map((set, index) => {
          if (index === setIndex) {
            return { ...set, [field]: value }
          }
          return set
        })
      )
    },
    []
  )

  const handleDuplicateSet = useCallback(
    async (setId: string) => {
      if (!setId || !onDuplicateSet) return

      setDuplicatingSetId(setId)
      try {
        await onDuplicateSet(setId)
      } catch (error) {
        console.error('Error duplicating set:', error)
      } finally {
        setDuplicatingSetId(null)
      }
    },
    [onDuplicateSet]
  )

  return (
    <div className="flex flex-col h-full w-full">
      {/* Exercise Details */}
      <div className="mb-6 p-3 sm:p-4 border border-border rounded-lg bg-muted w-full">
        <h3 className="font-medium text-foreground text-base sm:text-lg break-words">{exercise.name}</h3>
        {exercise.primaryFAUs.length > 0 && (
          <div className="mt-2">
            <span className="text-sm sm:text-base text-muted-foreground">Primary: </span>
            <span className="text-sm sm:text-base text-foreground">
              {exercise.primaryFAUs.map((fau) => FAU_DISPLAY_NAMES[fau] || fau).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Configuration Form */}
      <div className="space-y-6 w-full">
        {/* Exercise-level Intensity Type */}
        <div>
          <label className="block text-sm sm:text-base font-medium text-foreground mb-2">
            Intensity Type (All Sets)
          </label>
          <select
            value={exerciseIntensityType}
            onChange={(e) => setExerciseIntensityType(e.target.value as 'RIR' | 'RPE' | 'NONE')}
            className="w-full px-3 py-2 text-base border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground"
          >
            <option value="NONE">None</option>
            <option value="RIR">RIR (Reps in Reserve)</option>
            <option value="RPE">RPE (Rate of Perceived Exertion)</option>
          </select>
        </div>

        {/* Individual Set Configuration */}
        <div className="w-full">
          <div className="space-y-3 w-full">
            {sets.map((set, index) => (
              <div
                key={set.setNumber}
                className="border border-border rounded-lg p-3 sm:p-4 bg-muted w-full"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-12">
                    <span className="text-sm sm:text-base font-medium text-muted-foreground">Set {set.setNumber}</span>
                  </div>

                  {/* Reps */}
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm text-muted-foreground mb-1">Reps</label>
                    <input
                      type="text"
                      value={set.reps}
                      onChange={(e) => handleSetUpdate(index, 'reps', e.target.value)}
                      placeholder="8-12"
                      className="w-full px-2 sm:px-3 py-2 text-base border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                    />
                  </div>

                  {/* Intensity Value */}
                  {exerciseIntensityType !== 'NONE' && (
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm text-muted-foreground mb-1">
                        {exerciseIntensityType}
                      </label>
                      <input
                        type="number"
                        min={exerciseIntensityType === 'RIR' ? 0 : 1}
                        max={exerciseIntensityType === 'RIR' ? 5 : 10}
                        step={exerciseIntensityType === 'RPE' ? 0.5 : 1}
                        value={set.intensityValue || ''}
                        onChange={(e) =>
                          handleSetUpdate(
                            index,
                            'intensityValue',
                            e.target.value ? parseFloat(e.target.value) : undefined
                          )
                        }
                        placeholder={exerciseIntensityType === 'RIR' ? '0-5' : '1-10'}
                        className="w-full px-2 sm:px-3 py-2 text-base border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                      />
                    </div>
                  )}

                  {/* Duplicate Button - Only show for editing existing sets */}
                  {set.id && onDuplicateSet && (
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDuplicateSet(set.id!)}
                        disabled={duplicatingSetId !== null}
                        className="p-2 text-primary hover:text-primary/80 hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Duplicate this set"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add/Remove Set Buttons */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              type="button"
              onClick={handleAddSet}
              className="flex items-center gap-2 px-4 py-2 text-sm sm:text-base rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors font-medium"
              title="Add a new set (copies last set configuration)"
            >
              <PlusCircle size={20} />
              <span>Add Set</span>
            </button>
            <button
              type="button"
              onClick={handleRemoveSet}
              disabled={sets.length <= 1}
              className="flex items-center gap-2 px-4 py-2 text-sm sm:text-base rounded-lg bg-error/20 text-error hover:bg-error/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove last set"
            >
              <MinusCircle size={20} />
              <span>Remove Set</span>
            </button>
          </div>

          <div className="mt-4 text-xs sm:text-sm text-muted-foreground">
            <p>
              <strong>RIR:</strong> Reps in Reserve (0 = failure, 3 = could do 3 more reps)
            </p>
            <p>
              <strong>RPE:</strong> Rate of Perceived Exertion (1-10 scale, half values allowed)
            </p>
          </div>
        </div>

        {/* Exercise Notes */}
        <div>
          <label className="block text-sm sm:text-base font-medium text-foreground mb-2">
            Exercise Notes (Optional)
          </label>
          <textarea
            value={exerciseNotes}
            onChange={(e) => setExerciseNotes(e.target.value)}
            placeholder="Add any notes for this exercise (e.g., form cues, modifications, etc.)"
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base bg-background text-foreground"
          />
        </div>
      </div>
    </div>
  )
}
