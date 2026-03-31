'use client'

import { Plus, Trash } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/radix/popover'
import { useUserSettings } from '@/hooks/useUserSettings'
import { RIR_PRESETS, RPE_PRESETS } from '@/lib/constants/intensity-presets'
import type { ExerciseDefinition } from './ExerciseSearchInterface'

type Tab = 'sets' | 'notes'

export type ExercisePrescription = {
  sets: Array<{
    setNumber: number
    reps: string
    intensityType: 'RIR' | 'RPE' | 'NONE'
    intensityValue?: number
  }>
  notes?: string
}

interface SetConfigurationInterfaceProps {
  exercise: ExerciseDefinition
  initialConfig?: {
    sets: Array<{
      id?: string
      setNumber: number
      reps: string
      intensityValue?: number
    }>
    intensityType: 'RIR' | 'RPE' | 'NONE'
    notes: string
  }
  onConfigChange: (config: ExercisePrescription) => void
  showDuplicateButton?: boolean
  onDuplicateSet?: (setId: string) => Promise<void>
  isSystemExercise?: boolean
  onEditExercise?: () => void
}

const REP_PRESETS = [
  { value: '1-3', label: '1-3', description: 'Max Effort / Strength' },
  { value: '4-6', label: '4-6', description: 'Strength' },
  { value: '6-8', label: '6-8', description: 'Strength / Hypertrophy' },
  { value: '8-10', label: '8-10', description: 'Hypertrophy' },
  { value: '10-12', label: '10-12', description: 'Hypertrophy' },
  { value: '12-15', label: '12-15', description: 'Hypertrophy / Endurance' },
  { value: '15-20', label: '15-20', description: 'Muscular Endurance' },
  { value: 'AMRAP', label: 'AMRAP', description: 'As Many Reps As Possible' }
]

// RPE_PRESETS and RIR_PRESETS imported from @/lib/constants/intensity-presets

export function SetConfigurationInterface({
  exercise,
  initialConfig,
  onConfigChange,
  showDuplicateButton = false,
  onDuplicateSet,
  isSystemExercise = true,
  onEditExercise
}: SetConfigurationInterfaceProps) {
  const { settings } = useUserSettings()

  // Determine default intensity type
  const getDefaultIntensityType = (): 'RIR' | 'RPE' | 'NONE' => {
    if (initialConfig) return initialConfig.intensityType

    if (!settings?.defaultIntensityRating) {
      return 'NONE'
    }

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
  const [sets, setSets] = useState<Array<{
    id?: string
    setNumber: number
    reps: string
    intensityValue?: number
  }>>(
    initialConfig?.sets || [{ setNumber: 1, reps: '8-12' }]
  )
  const [customRepInput, setCustomRepInput] = useState<Record<number, string>>({})
  const [repValidationError, setRepValidationError] = useState<Record<number, string>>({})
  const [duplicatingSetId, setDuplicatingSetId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('sets')

  // Update intensity type when settings load (only for new exercises, not when editing)
  useEffect(() => {
    if (!initialConfig && settings?.defaultIntensityRating) {
      const newIntensityType = settings.defaultIntensityRating === 'rpe'
        ? 'RPE'
        : settings.defaultIntensityRating === 'rir'
        ? 'RIR'
        : 'NONE'

      setExerciseIntensityType(newIntensityType)
    }
  }, [settings?.defaultIntensityRating, initialConfig])

  // Update parent whenever form state changes
  useEffect(() => {
    const prescription: ExercisePrescription = {
      sets: sets.map(set => ({
        setNumber: set.setNumber,
        reps: set.reps,
        intensityType: exerciseIntensityType,
        intensityValue: exerciseIntensityType === 'NONE' ? undefined : set.intensityValue
      })),
      notes: exerciseNotes.trim() || undefined
    }
    onConfigChange(prescription)
  }, [sets, exerciseIntensityType, exerciseNotes, onConfigChange])

  const validateRepFormat = useCallback((value: string): string | null => {
    if (!value.trim()) return 'Required'

    const validPatterns = [
      /^\d+$/,
      /^\d+-\d+$/,
      /^\d+\+$/,
      /^AMRAP$/i
    ]

    if (!validPatterns.some(pattern => pattern.test(value.trim()))) {
      return 'Invalid format (use: 5, 8-12, or 20+)'
    }

    const singleNumberMatch = value.match(/^(\d+)$/)
    if (singleNumberMatch) {
      const num = parseInt(singleNumberMatch[1], 10)
      if (num === 0) {
        return 'Reps must be greater than 0'
      }
    }

    const rangeMatch = value.match(/^(\d+)-(\d+)$/)
    if (rangeMatch) {
      const [, start, end] = rangeMatch
      const startNum = parseInt(start, 10)
      const endNum = parseInt(end, 10)

      if (startNum === 0 || endNum === 0) {
        return 'Reps must be greater than 0'
      }
      if (startNum >= endNum) {
        return 'Range start must be less than end'
      }
    }

    const plusMatch = value.match(/^(\d+)\+$/)
    if (plusMatch) {
      const num = parseInt(plusMatch[1], 10)
      if (num === 0) {
        return 'Reps must be greater than 0'
      }
    }

    return null
  }, [])

  const handleSetUpdate = useCallback((setIndex: number, field: 'reps' | 'intensityValue', value: string | number | undefined) => {
    setSets(prev => prev.map((set, index) => {
      if (index === setIndex) {
        return { ...set, [field]: value }
      }
      return set
    }))
  }, [])

  const handleAddSet = useCallback(() => {
    setSets(prev => {
      const lastSet = prev[prev.length - 1]
      const newSet = {
        setNumber: prev.length + 1,
        reps: lastSet.reps,
        intensityValue: lastSet.intensityValue
      }
      return [...prev, newSet]
    })
  }, [])

  const handleDeleteSet = useCallback((setIndex: number) => {
    if (sets.length <= 1) return

    setSets(prev => {
      const updated = prev.filter((_, index) => index !== setIndex)
      return updated.map((set, index) => ({
        ...set,
        setNumber: index + 1
      }))
    })
  }, [sets.length])

  const handleDuplicateSet = useCallback(async (setId: string) => {
    if (!setId || !onDuplicateSet) return

    setDuplicatingSetId(setId)
    try {
      await onDuplicateSet(setId)
    } catch (error) {
      console.error('Error duplicating set:', error)
    } finally {
      setDuplicatingSetId(null)
    }
  }, [onDuplicateSet])

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {/* Exercise Details */}
      <div className="py-3 pb-0 bg-card">
        <div className="px-4 sm:px-6">
          {/* Exercise name */}
          <h3 className="font-bold text-foreground text-lg tracking-wide uppercase doom-heading">
            {exercise.name}
          </h3>

          {/* Tabs */}
          <div className="flex mt-2 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab('sets')}
              className={`relative px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
                activeTab === 'sets'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`relative px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
                activeTab === 'notes'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Notes
              {exerciseNotes.trim() && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
              )}
            </button>
            {!isSystemExercise && onEditExercise && (
              <button
                type="button"
                onClick={onEditExercise}
                className="relative px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all text-muted-foreground hover:text-foreground"
                aria-label="Edit exercise definition"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 sm:px-6 py-4 bg-card">
        {activeTab === 'sets' ? (
          <div className="space-y-4">
            {/* Exercise-level Intensity Type */}
            <div>
              <label htmlFor="exercise-intensity-type" className="block text-sm font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                INTENSITY TYPE
              </label>
              <select
                id="exercise-intensity-type"
                value={exerciseIntensityType}
                onChange={(e) => setExerciseIntensityType(e.target.value as 'RIR' | 'RPE' | 'NONE')}
                className="w-full px-3 py-2.5 border border-border focus:outline-none focus:border-primary bg-card text-foreground text-base"
              >
                <option value="NONE">None</option>
                <option value="RIR">RIR (Reps in Reserve)</option>
                <option value="RPE">RPE (Rate of Perceived Exertion)</option>
              </select>
            </div>

            {/* Individual Set Configuration - Table Layout */}
            <div>
              <h4 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">SETS</h4>
              <div className="border border-border divide-y divide-border">
                {/* Table header */}
                <div className="flex items-center px-3 py-1.5 bg-muted/50">
                  <span className="w-12 text-sm font-bold text-muted-foreground uppercase tracking-wider">#</span>
                  <span className="flex-1 text-sm font-bold text-muted-foreground uppercase tracking-wider">REPS</span>
                  {exerciseIntensityType !== 'NONE' && (
                    <span className="flex-1 text-sm font-bold text-muted-foreground uppercase tracking-wider">{exerciseIntensityType}</span>
                  )}
                  <span className="w-10" />
                </div>

                {/* Set rows */}
                {sets.map((set, index) => (
                  <div key={set.setNumber} className="flex items-center px-3 py-2.5 gap-2">
                    <span className="w-12 text-base font-bold text-muted-foreground">{set.setNumber}</span>

                    {/* Reps */}
                    <div className="flex-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-base border border-border hover:border-primary bg-card text-foreground text-left font-semibold transition-colors"
                          >
                            {set.reps || '8-12'}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3" align="start">
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                              SELECT REPS
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {REP_PRESETS.map((preset) => (
                                <button
                                  key={preset.value}
                                  type="button"
                                  onClick={() => {
                                    handleSetUpdate(index, 'reps', preset.value)
                                    setCustomRepInput({ ...customRepInput, [index]: '' })
                                    setRepValidationError({ ...repValidationError, [index]: '' })
                                  }}
                                  className={`px-2 py-1.5 text-sm border transition-colors font-bold ${
                                    set.reps === preset.value
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-card text-foreground border-border hover:border-primary'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                            {REP_PRESETS.find(p => p.value === set.reps) && (
                              <div className="px-2 py-1.5 bg-primary/10 border border-primary/30 text-xs text-primary font-bold">
                                {REP_PRESETS.find(p => p.value === set.reps)?.description}
                              </div>
                            )}
                            <div className="pt-2 border-t border-border">
                              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                                CUSTOM
                              </div>
                              <input
                                type="text"
                                value={customRepInput[index] !== undefined ? customRepInput[index] : set.reps}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setCustomRepInput({ ...customRepInput, [index]: value })
                                  handleSetUpdate(index, 'reps', value)
                                  const error = validateRepFormat(value)
                                  setRepValidationError({ ...repValidationError, [index]: error || '' })
                                }}
                                onBlur={(e) => {
                                  const error = validateRepFormat(e.target.value)
                                  setRepValidationError({ ...repValidationError, [index]: error || '' })
                                }}
                                onFocus={(e) => e.target.select()}
                                placeholder="e.g., 5, 8-12, 20+"
                                className={`w-full px-3 py-1.5 text-sm border focus:outline-none bg-card text-foreground ${
                                  repValidationError[index]
                                    ? 'border-error focus:border-error'
                                    : 'border-border focus:border-primary'
                                }`}
                              />
                              {repValidationError[index] && (
                                <div className="mt-1 text-xs text-error font-medium">
                                  {repValidationError[index]}
                                </div>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Intensity Value */}
                    {exerciseIntensityType !== 'NONE' && (
                      <div className="flex-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-base border border-border hover:border-primary bg-card text-foreground text-left font-semibold transition-colors"
                            >
                              {set.intensityValue !== undefined ? set.intensityValue : exerciseIntensityType === 'RIR' ? '0-5' : '6-10'}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-3" align="start">
                            <div className="space-y-2">
                              <div className="mb-2">
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  SELECT {exerciseIntensityType}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {exerciseIntensityType === 'RIR'
                                    ? 'How many more reps you could do'
                                    : 'How hard the set feels (1-10)'
                                  }
                                </div>
                              </div>
                              <div className={`grid gap-1.5 ${exerciseIntensityType === 'RIR' ? 'grid-cols-6' : 'grid-cols-5'}`}>
                                {exerciseIntensityType === 'RIR' ? (
                                  RIR_PRESETS.map((preset) => (
                                    <button
                                      key={preset.value}
                                      type="button"
                                      onClick={() => handleSetUpdate(index, 'intensityValue', preset.value)}
                                      className={`px-2 py-1.5 text-sm border transition-colors font-bold ${
                                        set.intensityValue === preset.value
                                          ? 'bg-primary text-primary-foreground border-primary'
                                          : 'bg-card text-foreground border-border hover:border-primary'
                                      }`}
                                    >
                                      {preset.label}
                                    </button>
                                  ))
                                ) : (
                                  RPE_PRESETS.map((preset) => (
                                    <button
                                      key={preset.value}
                                      type="button"
                                      onClick={() => handleSetUpdate(index, 'intensityValue', preset.value)}
                                      className={`px-2 py-1.5 text-sm border transition-colors font-bold ${
                                        set.intensityValue === preset.value
                                          ? 'bg-primary text-primary-foreground border-primary'
                                          : 'bg-card text-foreground border-border hover:border-primary'
                                      }`}
                                    >
                                      {preset.label}
                                    </button>
                                  ))
                                )}
                              </div>
                              {set.intensityValue !== undefined && (
                                <div className="px-2 py-1.5 bg-primary/10 border border-primary/30 text-xs text-primary font-bold">
                                  {exerciseIntensityType === 'RIR'
                                    ? RIR_PRESETS.find(p => p.value === set.intensityValue)?.description
                                    : RPE_PRESETS.find(p => p.value === set.intensityValue)?.description
                                  }
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {/* Duplicate Button - Only for existing sets */}
                    {showDuplicateButton && set.id && onDuplicateSet && (
                      <button
                        type="button"
                        onClick={() => handleDuplicateSet(set.id!)}
                        disabled={duplicatingSetId !== null}
                        className="p-1.5 text-primary hover:text-primary-hover transition-colors disabled:opacity-50"
                        title="Duplicate this set"
                      >
                        <Plus size={16} />
                      </button>
                    )}

                    {/* Delete Button */}
                    <div className="w-10 flex justify-end">
                      {sets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSet(index)}
                          className="p-1.5 text-error/50 hover:text-error transition-colors"
                          title="Delete this set"
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Set Button */}
              <button
                type="button"
                onClick={handleAddSet}
                className="w-full mt-2 py-2.5 border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors flex items-center justify-center gap-2 text-base font-bold uppercase tracking-wider"
              >
                <Plus size={16} />
                ADD SET (CLONES LAST)
              </button>
            </div>

          </div>
        ) : (
          /* Notes Tab */
          <div>
            <label htmlFor="exercise-notes-config" className="block text-sm font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
              EXERCISE NOTES
            </label>
            <textarea
              id="exercise-notes-config"
              value={exerciseNotes}
              onChange={(e) => setExerciseNotes(e.target.value)}
              placeholder="Add any notes for this exercise (e.g., form cues, modifications, etc.)"
              rows={10}
              className="w-full px-3 py-2 border border-border focus:outline-none focus:border-primary text-base bg-card text-foreground"
            />
          </div>
        )}
      </div>
    </div>
  )
}
