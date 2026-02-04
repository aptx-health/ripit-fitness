'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Plus, Trash } from 'lucide-react'
import { useUserSettings } from '@/hooks/useUserSettings'

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
  const [selectedFAUs, setSelectedFAUs] = useState<string[]>([])
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim())
      }
      if (selectedFAUs.length > 0) {
        params.append('faus', selectedFAUs.join(','))
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
  }, [searchQuery, selectedFAUs])

  // Search on mount and when query/filters change
  useEffect(() => {
    if (isOpen) {
      searchExercises()
    }
  }, [isOpen, searchExercises])

  const handleFAUToggle = useCallback((fau: string) => {
    setSelectedFAUs(prev => 
      prev.includes(fau) 
        ? prev.filter(f => f !== fau)
        : [...prev, fau]
    )
  }, [])

  const handleExerciseSelect = useCallback((exercise: ExerciseDefinition) => {
    setSelectedExercise(exercise)
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
    onClose()
  }, [selectedExercise, sets, exerciseIntensityType, exerciseNotes, onExerciseSelect, onClose, settings])

  const handleBackToSearch = useCallback(() => {
    setSelectedExercise(null)
  }, [])

  const handleClose = useCallback(() => {
    setSearchQuery('')
    setSelectedFAUs([])
    setExercises([])
    setError(null)
    setSelectedExercise(null)
    setSetCount(1)
    setExerciseIntensityType(settings?.defaultIntensityRating === 'rpe' ? 'RPE'
      : settings?.defaultIntensityRating === 'rir' ? 'RIR'
      : 'NONE')
    setExerciseNotes('')
    setSets([
      { setNumber: 1, reps: '8-12' }
    ])
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
                            <input
                              type="text"
                              value={set.reps}
                              onChange={(e) => handleSetUpdate(index, 'reps', e.target.value)}
                              placeholder="8-12"
                              className="w-full px-3 py-2 text-sm border-2 border-input focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground"
                            />
                          </div>

                          {/* Intensity Value */}
                          {exerciseIntensityType !== 'NONE' && (
                            <div className="flex-1">
                              <label className="block text-sm font-bold text-foreground mb-1 tracking-wide">
                                {exerciseIntensityType} Value (Optional)
                              </label>
                              <input
                                type="number"
                                min={exerciseIntensityType === 'RIR' ? 0 : 1}
                                max={exerciseIntensityType === 'RIR' ? 5 : 10}
                                step={exerciseIntensityType === 'RPE' ? 0.5 : 1}
                                value={set.intensityValue || ''}
                                onChange={(e) => handleSetUpdate(index, 'intensityValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder={exerciseIntensityType === 'RIR' ? '0-5' : '1-10'}
                                className="w-full px-3 py-2 text-sm border-2 border-input focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground"
                              />
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
                    Add Set
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-input focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground doom-input"
                />
              </div>

              {/* FAU Filters */}
              <div>
                <div className="text-sm font-bold text-foreground mb-2 tracking-wide">Filter by Muscle Group:</div>
                <div className="flex flex-wrap gap-2">
                  {ALL_FAUS.map((fau) => (
                    <button
                      key={fau}
                      onClick={() => handleFAUToggle(fau)}
                      className={`px-3 py-1 text-xs border-2 transition-colors font-bold uppercase tracking-wide ${
                        selectedFAUs.includes(fau)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-foreground border-input hover:border-primary'
                      }`}
                    >
                      {FAU_DISPLAY_NAMES[fau] || fau}
                    </button>
                  ))}
                </div>
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
              ) : exercises.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    {searchQuery || selectedFAUs.length > 0
                      ? 'No exercises found matching your search'
                      : 'No exercises available'
                    }
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