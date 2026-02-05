'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash } from 'lucide-react'
import { useUserSettings } from '@/hooks/useUserSettings'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/radix/popover'
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
}

const FAU_DISPLAY_NAMES: Record<string, string> = {
  'chest': 'Chest',
  'mid-back': 'Mid Back',
  'lower-back': 'Lower Back',
  'front-delts': 'Front Delts',
  'side-delts': 'Side Delts',
  'rear-delts': 'Rear Delts',
  'lats': 'Lats',
  'traps': 'Traps',
  'biceps': 'Biceps',
  'triceps': 'Triceps',
  'forearms': 'Forearms',
  'quads': 'Quads',
  'adductors': 'Adductors',
  'hamstrings': 'Hamstrings',
  'glutes': 'Glutes',
  'calves': 'Calves',
  'abs': 'Abs',
  'obliques': 'Obliques'
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

const RIR_PRESETS = [
  { value: 0, label: '0', description: 'Max effort, failure reached. Use sparingly' },
  { value: 1, label: '1', description: '1 rep left in the tank' },
  { value: 2, label: '2', description: '2 reps left in the tank' },
  { value: 3, label: '3', description: '3 reps left in the tank' },
  { value: 4, label: '4', description: '4 reps left in the tank' },
  { value: 5, label: '5+', description: 'Warmup / Deload sets' }
]

const RPE_PRESETS = [
  { value: 6.0, label: '6', description: 'Light effort, easy reps' },
  { value: 6.5, label: '6.5', description: 'Light to moderate effort' },
  { value: 7.0, label: '7', description: 'Moderate effort, could do several more' },
  { value: 7.5, label: '7.5', description: 'Moderate to challenging' },
  { value: 8.0, label: '8', description: 'Challenging, 2-3 reps left' },
  { value: 8.5, label: '8.5', description: 'Very challenging, 1-2 reps left' },
  { value: 9.0, label: '9', description: 'Very hard, 1 rep left' },
  { value: 9.5, label: '9.5', description: 'Near maximal, failure on next rep' },
  { value: 10, label: '10', description: 'Max effort, failure reached. Use sparingly' }
]

export function SetConfigurationInterface({
  exercise,
  initialConfig,
  onConfigChange,
  showDuplicateButton = false,
  onDuplicateSet
}: SetConfigurationInterfaceProps) {
  const { settings } = useUserSettings()

  // Determine default intensity type
  const getDefaultIntensityType = (): 'RIR' | 'RPE' | 'NONE' => {
    if (initialConfig) return initialConfig.intensityType

    if (!settings?.defaultIntensityRating || settings.defaultIntensityRating === 'none') {
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
        : settings.defaultIntensityRating === 'none'
        ? 'NONE'
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
      const num = parseInt(singleNumberMatch[1])
      if (num === 0) {
        return 'Reps must be greater than 0'
      }
    }

    const rangeMatch = value.match(/^(\d+)-(\d+)$/)
    if (rangeMatch) {
      const [, start, end] = rangeMatch
      const startNum = parseInt(start)
      const endNum = parseInt(end)

      if (startNum === 0 || endNum === 0) {
        return 'Reps must be greater than 0'
      }
      if (startNum >= endNum) {
        return 'Range start must be less than end'
      }
    }

    const plusMatch = value.match(/^(\d+)\+$/)
    if (plusMatch) {
      const num = parseInt(plusMatch[1])
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
      <div className="py-4 pb-0 bg-muted">
        <div className="px-4 sm:px-6 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-foreground text-lg tracking-wide uppercase">
              {exercise.name}
            </h3>
          </div>

          {/* Folder-style Tabs */}
          <div className="flex gap-1 -mb-[2px] relative z-10">
            <button
              type="button"
              onClick={() => setActiveTab('sets')}
              className={`relative px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
                activeTab === 'sets'
                  ? 'text-primary border-2 border-b-0 border-primary bg-card shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]'
                  : 'text-muted-foreground border-2 border-border bg-muted/50 hover:text-primary hover:shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]'
              }`}
            >
              Sets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`relative px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
                activeTab === 'notes'
                  ? 'text-primary border-2 border-b-0 border-primary bg-card shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]'
                  : 'text-muted-foreground border-2 border-border bg-muted/50 hover:text-primary hover:shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]'
              }`}
            >
              Notes
              {exerciseNotes.trim() && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 sm:px-6 py-4 bg-card border-t-2 border-border">
        {activeTab === 'sets' ? (
          <div className="space-y-4">
            {/* Exercise-level Intensity Type */}
          <div>
            <label className="block text-base font-bold text-foreground mb-2 tracking-wide uppercase">
              Intensity Type (All Sets)
            </label>
            <select
              value={exerciseIntensityType}
              onChange={(e) => setExerciseIntensityType(e.target.value as 'RIR' | 'RPE' | 'NONE')}
              className="w-full px-3 py-2 border-2 border-input focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-muted text-foreground doom-input"
            >
              <option value="NONE">None</option>
              <option value="RIR">RIR (Reps in Reserve)</option>
              <option value="RPE">RPE (Rate of Perceived Exertion)</option>
            </select>
          </div>

          {/* Individual Set Configuration */}
          <div>
            <h4 className="text-base font-bold text-foreground mb-3 tracking-wide uppercase">Sets</h4>
            <div className="space-y-2">
              {sets.map((set, index) => (
                <div key={set.setNumber} className="border-2 border-border p-3 bg-muted">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-16">
                      <span className="text-base font-bold text-foreground tracking-wide uppercase">Set {set.setNumber}</span>
                    </div>

                    {/* Reps */}
                    <div className="flex-1">
                      <label className="block text-base font-bold text-foreground mb-1 tracking-wide uppercase">Reps</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-sm border-2 border-input hover:border-primary focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground text-left"
                          >
                            {set.reps || '8-12'}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-3" align="start">
                          <div className="space-y-2">
                            <div className="text-sm font-bold text-foreground uppercase tracking-wide mb-2">
                              Select Reps
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {REP_PRESETS.map((preset) => (
                                <button
                                  key={preset.value}
                                  type="button"
                                  onClick={() => {
                                    handleSetUpdate(index, 'reps', preset.value)
                                    setCustomRepInput({ ...customRepInput, [index]: '' })
                                    setRepValidationError({ ...repValidationError, [index]: '' })
                                  }}
                                  className={`px-3 py-2 text-sm border-2 transition-colors font-bold ${
                                    set.reps === preset.value
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-muted text-foreground border-input hover:border-primary'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                            {REP_PRESETS.find(p => p.value === set.reps) && (
                              <div className="px-2 py-2 bg-primary/10 border border-primary/30 rounded">
                                <div className="text-sm text-primary font-bold">
                                  {REP_PRESETS.find(p => p.value === set.reps)?.description}
                                </div>
                              </div>
                            )}
                            <div className="pt-2 border-t-2 border-border">
                              <div className="text-sm font-bold text-foreground uppercase tracking-wide mb-2">
                                Custom
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
                                className={`w-full px-3 py-2 text-sm border-2 focus:outline-none focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground ${
                                  repValidationError[index]
                                    ? 'border-error focus:border-error'
                                    : 'border-input focus:border-primary'
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
                        <label className="block text-base font-bold text-foreground mb-1 tracking-wide uppercase">
                          {exerciseIntensityType} Value
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-sm border-2 border-input hover:border-primary focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground text-left"
                            >
                              {set.intensityValue !== undefined ? set.intensityValue : exerciseIntensityType === 'RIR' ? '0-5' : '6-10'}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-3" align="start">
                            <div className="space-y-2">
                              <div className="mb-3">
                                <div className="text-sm font-bold text-foreground uppercase tracking-wide">
                                  Select {exerciseIntensityType}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 font-medium">
                                  {exerciseIntensityType === 'RIR'
                                    ? 'Reps in Reserve: How many more reps you could do'
                                    : 'Rate of Perceived Exertion: How hard the set feels (1-10 scale)'
                                  }
                                </div>
                              </div>
                              <div className={`grid gap-2 ${exerciseIntensityType === 'RIR' ? 'grid-cols-6' : 'grid-cols-5'}`}>
                                {exerciseIntensityType === 'RIR' ? (
                                  RIR_PRESETS.map((preset) => (
                                    <button
                                      key={preset.value}
                                      type="button"
                                      onClick={() => handleSetUpdate(index, 'intensityValue', preset.value)}
                                      className={`px-3 py-2 text-sm border-2 transition-colors font-bold ${
                                        set.intensityValue === preset.value
                                          ? 'bg-primary text-primary-foreground border-primary'
                                          : 'bg-muted text-foreground border-input hover:border-primary'
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
                                      className={`px-3 py-2 text-sm border-2 transition-colors font-bold ${
                                        set.intensityValue === preset.value
                                          ? 'bg-primary text-primary-foreground border-primary'
                                          : 'bg-muted text-foreground border-input hover:border-primary'
                                      }`}
                                    >
                                      {preset.label}
                                    </button>
                                  ))
                                )}
                              </div>
                              {set.intensityValue !== undefined && (
                                <div className="px-2 py-2 bg-primary/10 border border-primary/30 rounded">
                                  <div className="text-sm text-primary font-bold">
                                    {exerciseIntensityType === 'RIR'
                                      ? RIR_PRESETS.find(p => p.value === set.intensityValue)?.description
                                      : RPE_PRESETS.find(p => p.value === set.intensityValue)?.description
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {/* Duplicate Button - Only for existing sets */}
                    {showDuplicateButton && set.id && onDuplicateSet && (
                      <div className="flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDuplicateSet(set.id!)}
                          disabled={duplicatingSetId !== null}
                          className="p-2 text-primary hover:text-primary-hover hover:bg-primary-muted border-2 border-transparent hover:border-primary transition-colors disabled:opacity-50"
                          title="Duplicate this set"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    )}

                    {/* Delete Button */}
                    {sets.length > 1 && (
                      <div className="flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDeleteSet(index)}
                          className="p-2 text-error hover:text-error-hover hover:bg-error-muted border-2 border-transparent hover:border-error transition-colors"
                          title="Delete this set"
                        >
                          <Trash size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Set Button */}
            <button
              type="button"
              onClick={handleAddSet}
              className="w-full mt-3 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 font-bold uppercase tracking-wider doom-button-3d"
            >
              <Plus size={18} />
              Add Set (Clones Last)
            </button>
          </div>

          </div>
        ) : (
          /* Notes Tab */
          <div>
            <label className="block text-base font-bold text-foreground mb-2 tracking-wide uppercase">
              Exercise Notes (Optional)
            </label>
            <textarea
              value={exerciseNotes}
              onChange={(e) => setExerciseNotes(e.target.value)}
              placeholder="Add any notes for this exercise (e.g., form cues, modifications, etc.)"
              rows={10}
              className="w-full px-3 py-2 border-2 border-input focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] text-sm bg-card text-foreground"
            />
          </div>
        )}
      </div>
    </div>
  )
}
