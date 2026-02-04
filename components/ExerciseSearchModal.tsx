'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Plus, Trash } from 'lucide-react'
import { useUserSettings } from '@/hooks/useUserSettings'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/radix/popover'

type ExerciseDefinition = {
  id: string
  name: string
  primaryFAUs: string[]
  secondaryFAUs: string[]
  equipment: string[]
  instructions?: string
}

type EditingExercise = {
  id: string
  name: string
  notes?: string | null
  prescribedSets: Array<{
    id: string
    setNumber: number
    reps: string
    rpe?: number | null
    rir?: number | null
  }>
  exerciseDefinition: {
    id: string
    name: string
    primaryFAUs: string[]
    secondaryFAUs: string[]
  }
}

type ExerciseSearchModalProps = {
  isOpen: boolean
  onClose: () => void
  onExerciseSelect: (exercise: ExerciseDefinition, prescription: ExercisePrescription) => void
  editingExercise?: EditingExercise | null
}

type ExercisePrescription = {
  sets: Array<{
    setNumber: number
    reps: string
    intensityType: 'RIR' | 'RPE' | 'NONE'
    intensityValue?: number
  }>
  notes?: string
}

// All available FAUs for filtering
const ALL_FAUS = [
  'chest', 'mid-back', 'lower-back', 'front-delts', 'side-delts', 'rear-delts',
  'lats', 'traps', 'biceps', 'triceps', 'forearms',
  'quads', 'adductors', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques'
]

// Common equipment types (matches database values)
const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbells',
  'cable',
  'machine',
  'bodyweight',
  'resistance band',
  'kettlebell',
  'other'
]

const EQUIPMENT_DISPLAY_NAMES: Record<string, string> = {
  'barbell': 'Barbell',
  'dumbbells': 'Dumbbells',
  'cable': 'Cable',
  'machine': 'Machine',
  'bodyweight': 'Bodyweight',
  'resistance band': 'Resistance Band',
  'kettlebell': 'Kettlebell',
  'other': 'Other'
}

// Common rep presets with descriptors
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

// RIR presets (0-5+)
const RIR_PRESETS = [
  { value: 0, label: '0', description: 'Max effort, failure reached. Use sparingly' },
  { value: 1, label: '1', description: '1 rep left in the tank' },
  { value: 2, label: '2', description: '2 reps left in the tank' },
  { value: 3, label: '3', description: '3 reps left in the tank' },
  { value: 4, label: '4', description: '4 reps left in the tank' },
  { value: 5, label: '5+', description: 'Warmup / Deload sets' }
]

// RPE presets (6.0-10.0)
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

export default function ExerciseSearchModal({
  isOpen,
  onClose,
  onExerciseSelect,
  editingExercise
}: ExerciseSearchModalProps) {
  const { settings } = useUserSettings()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFAU, setSelectedFAU] = useState<string | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null)
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Helper function to get initial form state
  const getInitialFormState = () => {
    if (editingExercise) {
      // Determine intensity type from prescribed sets
      const firstSet = editingExercise.prescribedSets[0]
      let intensityType: 'RIR' | 'RPE' | 'NONE' = 'NONE'
      if (firstSet?.rpe !== null && firstSet?.rpe !== undefined) {
        intensityType = 'RPE'
      } else if (firstSet?.rir !== null && firstSet?.rir !== undefined) {
        intensityType = 'RIR'
      }

      return {
        selectedExercise: {
          ...editingExercise.exerciseDefinition,
          equipment: [], // Add missing required field
          instructions: undefined
        },
        setCount: editingExercise.prescribedSets.length,
        exerciseIntensityType: intensityType,
        exerciseNotes: editingExercise.notes || '',
        sets: editingExercise.prescribedSets.map(set => ({
          id: set.id,
          setNumber: set.setNumber,
          reps: set.reps,
          intensityValue: intensityType === 'RPE' ? (set.rpe ?? undefined) :
                         intensityType === 'RIR' ? (set.rir ?? undefined) : undefined
        }))
      }
    }

    // When adding new exercise: use user's preferred setting
    const defaultIntensityType = (): 'RIR' | 'RPE' | 'NONE' => {
      if (!settings?.defaultIntensityRating) return 'NONE'
      return settings.defaultIntensityRating === 'rpe' ? 'RPE'
        : settings.defaultIntensityRating === 'rir' ? 'RIR'
        : 'NONE'
    }

    return {
      selectedExercise: null,
      setCount: 1,
      exerciseIntensityType: defaultIntensityType(),
      exerciseNotes: '',
      sets: [
        { setNumber: 1, reps: '8-12' }
      ]
    }
  }

  const initialState = getInitialFormState()

  // Exercise prescription form state
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(initialState.selectedExercise)
  const [setCount, setSetCount] = useState(initialState.setCount)
  const [exerciseIntensityType, setExerciseIntensityType] = useState<'RIR' | 'RPE' | 'NONE'>(initialState.exerciseIntensityType)
  const [exerciseNotes, setExerciseNotes] = useState(initialState.exerciseNotes)
  const [sets, setSets] = useState<Array<{
    id?: string
    setNumber: number
    reps: string
    intensityValue?: number
  }>>(initialState.sets)
  const [customRepInput, setCustomRepInput] = useState<Record<number, string>>({})
  const [repValidationError, setRepValidationError] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!editingExercise) return

    const firstSet = editingExercise.prescribedSets[0]
    let intensityType: 'RIR' | 'RPE' | 'NONE' = 'NONE'

    if (firstSet?.rpe != null) intensityType = 'RPE'
    else if (firstSet?.rir != null) intensityType = 'RIR'

    setSelectedExercise({
      ...editingExercise.exerciseDefinition,
      equipment: [],
      instructions: undefined,
    })

    setSetCount(editingExercise.prescribedSets.length)
    setExerciseIntensityType(intensityType)
    setExerciseNotes(editingExercise.notes || '')
    setSets(
      editingExercise.prescribedSets.map(set => ({
        id: set.id,
        setNumber: set.setNumber,
        reps: set.reps,
        intensityValue:
          intensityType === 'RPE'
            ? set.rpe ?? undefined
            : intensityType === 'RIR'
            ? set.rir ?? undefined
            : undefined,
      }))
    )
  }, [editingExercise])

  // Update intensity type when settings load (only for new exercises, not when editing)
  useEffect(() => {
    if (editingExercise || !settings?.defaultIntensityRating) return

    const defaultType = settings.defaultIntensityRating === 'rpe' ? 'RPE'
      : settings.defaultIntensityRating === 'rir' ? 'RIR'
      : 'NONE'

    setExerciseIntensityType(defaultType)
  }, [settings, editingExercise])
  

  const searchExercises = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim())
      }
      if (selectedFAU) {
        params.append('faus', selectedFAU)
      }
      if (selectedEquipment) {
        params.append('equipment', selectedEquipment)
      }
      params.append('limit', '50')

      const response = await fetch(`/api/exercises/search?${params}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to search exercises')
      }

      const { exercises } = await response.json()
      setExercises(exercises)
    } catch (error) {
      console.error('Error searching exercises:', error)
      setError(error instanceof Error ? error.message : 'Failed to search exercises')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, selectedFAU, selectedEquipment])

  // Search when query/filters change (but not on initial open)
  useEffect(() => {
    if (isOpen && (searchQuery.trim() || selectedFAU || selectedEquipment)) {
      searchExercises()
    }
  }, [isOpen, searchQuery, selectedFAU, selectedEquipment, searchExercises])

  const handleFAUSelect = useCallback((fau: string | null) => {
    setSelectedFAU(fau)
  }, [])

  const handleEquipmentSelect = useCallback((equipment: string | null) => {
    setSelectedEquipment(equipment)
  }, [])

  const handleExerciseSelect = useCallback((exercise: ExerciseDefinition) => {
    setSelectedExercise(exercise)
  }, [])

  const validateRepFormat = useCallback((value: string): string | null => {
    if (!value.trim()) return 'Required'

    // Valid formats:
    // - Single number: "5", "10", "20"
    // - Range: "8-12", "10-15"
    // - Plus notation: "20+"
    // - AMRAP
    const validPatterns = [
      /^\d+$/, // Single number
      /^\d+-\d+$/, // Range
      /^\d+\+$/, // Plus notation
      /^AMRAP$/i // AMRAP (case insensitive)
    ]

    if (!validPatterns.some(pattern => pattern.test(value.trim()))) {
      return 'Invalid format (use: 5, 8-12, or 20+)'
    }

    // Check for single number being 0
    const singleNumberMatch = value.match(/^(\d+)$/)
    if (singleNumberMatch) {
      const num = parseInt(singleNumberMatch[1])
      if (num === 0) {
        return 'Reps must be greater than 0'
      }
    }

    // Additional validation for ranges
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

    // Check for plus notation being 0+
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
    setSetCount(sets.length + 1)
  }, [sets.length])

  const handleDeleteSet = useCallback((setIndex: number) => {
    if (sets.length <= 1) return

    setSets(prev => {
      const updated = prev.filter((_, index) => index !== setIndex)
      return updated.map((set, index) => ({
        ...set,
        setNumber: index + 1
      }))
    })
    setSetCount(sets.length - 1)
  }, [sets.length])

  const handleConfirmExercise = useCallback(() => {
    if (!selectedExercise) return

    // Validate all rep inputs before submitting
    const errors: Record<number, string> = {}
    sets.forEach((set, index) => {
      const error = validateRepFormat(set.reps)
      if (error) {
        errors[index] = error
      }
    })

    if (Object.keys(errors).length > 0) {
      setRepValidationError(errors)
      return
    }

    const prescription: ExercisePrescription = {
      sets: sets.map(set => ({
        setNumber: set.setNumber,
        reps: set.reps,
        intensityType: exerciseIntensityType,
        intensityValue: exerciseIntensityType === 'NONE' ? undefined : set.intensityValue
      })),
      notes: exerciseNotes.trim() || undefined
    }

    onExerciseSelect(selectedExercise, prescription)

    // Reset form
    setSelectedExercise(null)
    setSetCount(1)
    setExerciseIntensityType(settings?.defaultIntensityRating === 'rpe' ? 'RPE'
      : settings?.defaultIntensityRating === 'rir' ? 'RIR'
      : 'NONE')
    setExerciseNotes('')
    setSets([
      { setNumber: 1, reps: '8-12' }
    ])
    setCustomRepInput({})
    setRepValidationError({})
    onClose()
  }, [selectedExercise, sets, exerciseIntensityType, exerciseNotes, onExerciseSelect, onClose, settings])

  const handleBackToSearch = useCallback(() => {
    setSelectedExercise(null)
  }, [])

  const handleClose = useCallback(() => {
    setSearchQuery('')
    setSelectedFAU(null)
    setSelectedEquipment(null)
    setExercises([])
    setError(null)
    setHasSearched(false)
    setSelectedExercise(null)
    setSetCount(1)
    setExerciseIntensityType(settings?.defaultIntensityRating === 'rpe' ? 'RPE'
      : settings?.defaultIntensityRating === 'rir' ? 'RIR'
      : 'NONE')
    setExerciseNotes('')
    setSets([
      { setNumber: 1, reps: '8-12' }
    ])
    setCustomRepInput({})
    setRepValidationError({})
    onClose()
  }, [onClose, settings])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-card border-2 border-border w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[85vh] flex flex-col mx-auto doom-card">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-border">
          <h2 className="text-xl font-bold text-foreground tracking-wide uppercase">
            {editingExercise ? 'Edit Exercise' : selectedExercise ? 'Configure Exercise' : 'Add Exercise'}
          </h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={24} />
          </button>
        </div>

        {(selectedExercise || editingExercise) ? (
          /* Exercise Configuration Form */
          <>
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Exercise Details */}
            <div className="p-4 border-b-2 border-border bg-muted">
              <div className="flex items-start gap-4">
                {!editingExercise && (
                  <button
                    onClick={handleBackToSearch}
                    className="text-primary hover:text-primary-hover text-sm flex items-center gap-1 font-bold tracking-wide doom-link"
                  >
                    ← Back to Search
                  </button>
                )}
              </div>
              <div className="mt-2">
                <h3 className="font-bold text-foreground text-lg tracking-wide">
                  {editingExercise ? editingExercise.exerciseDefinition.name : selectedExercise?.name}
                </h3>
                {((editingExercise?.exerciseDefinition.primaryFAUs || selectedExercise?.primaryFAUs)?.length ?? 0) > 0 && (
                  <div className="mt-1">
                    <span className="text-sm text-muted-foreground">Primary: </span>
                    {(editingExercise?.exerciseDefinition.primaryFAUs || selectedExercise?.primaryFAUs)
                      ?.map(fau => FAU_DISPLAY_NAMES[fau] || fau).join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Configuration Form */}
            <div className="p-4">
              <div className="space-y-4">
                {/* Exercise-level Intensity Type */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 tracking-wide">
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
                  <h4 className="text-sm font-bold text-foreground mb-2 tracking-wide">Set Configuration</h4>
                  <div className="space-y-2">
                    {sets.map((set, index) => (
                      <div key={set.setNumber} className="border-2 border-border p-3 bg-muted">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-12">
                            <span className="text-sm font-bold text-foreground tracking-wide">Set {set.setNumber}</span>
                          </div>

                          {/* Reps */}
                          <div className="flex-1">
                            <label className="block text-sm font-bold text-foreground mb-1 tracking-wide">Reps</label>
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
                                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
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
                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                                      Custom
                                    </div>
                                    <input
                                      type="text"
                                      value={customRepInput[index] !== undefined ? customRepInput[index] : set.reps}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        setCustomRepInput({ ...customRepInput, [index]: value })
                                        handleSetUpdate(index, 'reps', value)

                                        // Validate on change
                                        const error = validateRepFormat(value)
                                        setRepValidationError({ ...repValidationError, [index]: error || '' })
                                      }}
                                      onBlur={(e) => {
                                        // Final validation on blur
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
                              <label className="block text-sm font-bold text-foreground mb-1 tracking-wide">
                                {exerciseIntensityType} Value (Optional)
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
                                      <div className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                                        Select {exerciseIntensityType}
                                      </div>
                                      <div className="text-sm text-muted-foreground mt-1">
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

                {/* Exercise Notes */}
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1 tracking-wide">
                    Exercise Notes (Optional)
                  </label>
                  <textarea
                    value={exerciseNotes}
                    onChange={(e) => setExerciseNotes(e.target.value)}
                    placeholder="Add any notes for this exercise (e.g., form cues, modifications, etc.)"
                    rows={3}
                    className="w-full px-3 py-2 border-2 border-input focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] text-sm bg-card text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t-2 border-border bg-muted">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleClose}
                  className="px-6 py-3 text-secondary-foreground bg-secondary border-2 border-secondary hover:bg-secondary-hover font-bold uppercase tracking-wider transition-all shadow-[0_3px_0_var(--secondary-active),0_5px_8px_rgba(0,0,0,0.4)] hover:shadow-[0_3px_0_var(--secondary-active),0_0_20px_rgba(0,0,0,0.6)] active:translate-y-[3px] active:shadow-[0_0_0_var(--secondary-active),0_2px_4px_rgba(0,0,0,0.4)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmExercise}
                  className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary-hover font-bold uppercase tracking-wider doom-button-3d"
                >
                  {editingExercise ? 'Update Exercise' : 'Add Exercise'}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Exercise Search Interface */
          <>
            {/* Search */}
            <div className="p-4 border-b-2 border-border">
              <div className="relative mb-3">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '3rem' }}
                  className="w-full pr-4 py-2 border-2 border-input focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground doom-input"
                />
              </div>

              {/* FAU Filter */}
              <div>
                <div className="text-sm font-bold text-foreground mb-2 tracking-wide">Filter by Muscle Group:</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full px-4 py-2 border-2 border-input hover:border-primary focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground text-left font-bold"
                    >
                      {selectedFAU ? FAU_DISPLAY_NAMES[selectedFAU] : 'All Muscle Groups'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="start">
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">
                        Select Muscle Group
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        <button
                          type="button"
                          onClick={() => handleFAUSelect(null)}
                          className={`w-full px-3 py-2 text-sm border-2 transition-colors font-bold text-left ${
                            selectedFAU === null
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted text-foreground border-input hover:border-primary'
                          }`}
                        >
                          All Muscle Groups
                        </button>
                        {ALL_FAUS.map((fau) => (
                          <button
                            key={fau}
                            type="button"
                            onClick={() => handleFAUSelect(fau)}
                            className={`w-full px-3 py-2 text-sm border-2 transition-colors font-bold text-left ${
                              selectedFAU === fau
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted text-foreground border-input hover:border-primary'
                            }`}
                          >
                            {FAU_DISPLAY_NAMES[fau] || fau}
                          </button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Equipment Filter */}
              <div className="mt-3">
                <div className="text-sm font-bold text-foreground mb-2 tracking-wide">Filter by Equipment:</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full px-4 py-2 border-2 border-input hover:border-primary focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground text-left font-bold"
                    >
                      {selectedEquipment ? EQUIPMENT_DISPLAY_NAMES[selectedEquipment] : 'All Equipment'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="start">
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">
                        Select Equipment
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        <button
                          type="button"
                          onClick={() => handleEquipmentSelect(null)}
                          className={`w-full px-3 py-2 text-sm border-2 transition-colors font-bold text-left ${
                            selectedEquipment === null
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted text-foreground border-input hover:border-primary'
                          }`}
                        >
                          All Equipment
                        </button>
                        {EQUIPMENT_TYPES.map((equipment) => (
                          <button
                            key={equipment}
                            type="button"
                            onClick={() => handleEquipmentSelect(equipment)}
                            className={`w-full px-3 py-2 text-sm border-2 transition-colors font-bold text-left ${
                              selectedEquipment === equipment
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted text-foreground border-input hover:border-primary'
                            }`}
                          >
                            {EQUIPMENT_DISPLAY_NAMES[equipment] || equipment}
                          </button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-auto p-4 min-h-0">
              {error && (
                <div className="bg-error-muted border border-error-border rounded-lg p-4 mb-4">
                  <div className="text-error">{error}</div>
                </div>
              )}

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Searching exercises...</div>
                </div>
              ) : !hasSearched ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    Enter a search term or select a filter to find exercises
                  </div>
                </div>
              ) : exercises.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    No exercises found matching your search
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {exercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="border-2 border-border p-4 hover:border-primary transition-all hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] bg-card"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-foreground mb-2 tracking-wide">{exercise.name}</h3>

                          {exercise.primaryFAUs.length > 0 && (
                            <div className="mb-2">
                              <span className="text-sm text-muted-foreground">Primary: </span>
                              {exercise.primaryFAUs.map(fau => FAU_DISPLAY_NAMES[fau] || fau).join(', ')}
                            </div>
                          )}

                          {exercise.secondaryFAUs.length > 0 && (
                            <div className="mb-2">
                              <span className="text-sm text-muted-foreground">Secondary: </span>
                              {exercise.secondaryFAUs.map(fau => FAU_DISPLAY_NAMES[fau] || fau).join(', ')}
                            </div>
                          )}

                          {exercise.equipment.length > 0 && (
                            <div className="mb-2">
                              <span className="text-sm text-muted-foreground">Equipment: </span>
                              {exercise.equipment.join(', ')}
                            </div>
                          )}

                          {exercise.instructions && (
                            <div className="text-sm text-muted-foreground mt-2">
                              {exercise.instructions}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleExerciseSelect(exercise)}
                          className="ml-4 px-3 py-1 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors flex items-center gap-1 font-bold uppercase tracking-wider text-xs"
                        >
                          <Plus size={16} />
                          Select
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}