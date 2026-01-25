'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Plus } from 'lucide-react'

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

    return {
      selectedExercise: null,
      setCount: 3,
      exerciseIntensityType: 'NONE' as const,
      exerciseNotes: '',
      sets: [
        { setNumber: 1, reps: '8-12' },
        { setNumber: 2, reps: '8-12' },
        { setNumber: 3, reps: '8-12' }
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
  const [duplicatingSetId, setDuplicatingSetId] = useState<string | null>(null)

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

  const handleSetCountChange = useCallback((newCount: number) => {
    setSetCount(newCount)
    setSets(prev => {
      const newSets = []
      for (let i = 0; i < newCount; i++) {
        if (i < prev.length) {
          // Keep existing set data
          newSets.push({ ...prev[i], setNumber: i + 1 })
        } else {
          // Add new set with defaults
          newSets.push({
            setNumber: i + 1,
            reps: '8-12',
            intensityValue: undefined
          })
        }
      }
      return newSets
    })
  }, [])

  const handleSetUpdate = useCallback((setIndex: number, field: 'reps' | 'intensityValue', value: string | number | undefined) => {
    setSets(prev => prev.map((set, index) => {
      if (index === setIndex) {
        return { ...set, [field]: value }
      }
      return set
    }))
  }, [])

  const handleDuplicateSet = useCallback(async (setId: string) => {
    if (!setId) return

    setDuplicatingSetId(setId)
    setError(null)

    try {
      const response = await fetch(`/api/prescribed-sets/${setId}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate set')
      }

      const { exercise } = await response.json()

      // Update local state with new sets from server
      const intensityType = exerciseIntensityType
      setSets(
        exercise.prescribedSets.map((set: any) => ({
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
      setSetCount(exercise.prescribedSets.length)
    } catch (error) {
      console.error('Error duplicating set:', error)
      setError(error instanceof Error ? error.message : 'Failed to duplicate set')
    } finally {
      setDuplicatingSetId(null)
    }
  }, [exerciseIntensityType])

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
    setSetCount(3)
    setExerciseIntensityType('NONE')
    setExerciseNotes('')
    setSets([
      { setNumber: 1, reps: '8-12' },
      { setNumber: 2, reps: '8-12' },
      { setNumber: 3, reps: '8-12' }
    ])
    onClose()
  }, [selectedExercise, sets, exerciseIntensityType, exerciseNotes, onExerciseSelect, onClose])

  const handleBackToSearch = useCallback(() => {
    setSelectedExercise(null)
  }, [])

  const handleClose = useCallback(() => {
    setSearchQuery('')
    setSelectedFAUs([])
    setExercises([])
    setError(null)
    setSelectedExercise(null)
    setSetCount(3)
    setExerciseIntensityType('NONE')
    setExerciseNotes('')
    setSets([
      { setNumber: 1, reps: '8-12' },
      { setNumber: 2, reps: '8-12' },
      { setNumber: 3, reps: '8-12' }
    ])
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
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
          <div className="h-[calc(100vh-200px)] overflow-y-auto">
            {/* Exercise Details */}
            <div className="p-6 border-b border-border bg-muted">
              <div className="flex items-start gap-4">
                {!editingExercise && (
                  <button
                    onClick={handleBackToSearch}
                    className="text-primary hover:text-primary-hover text-sm flex items-center gap-1"
                  >
                    ← Back to search
                  </button>
                )}
              </div>
              <div className="mt-3">
                <h3 className="font-medium text-foreground text-lg">
                  {editingExercise ? editingExercise.exerciseDefinition.name : selectedExercise?.name}
                </h3>
                {((editingExercise?.exerciseDefinition.primaryFAUs || selectedExercise?.primaryFAUs)?.length ?? 0) > 0 && (
                  <div className="mt-2">
                    <span className="text-sm text-muted-foreground">Primary: </span>
                    {(editingExercise?.exerciseDefinition.primaryFAUs || selectedExercise?.primaryFAUs)
                      ?.map(fau => FAU_DISPLAY_NAMES[fau] || fau).join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Configuration Form */}
            <div className="flex-1 p-6">
              <div className="max-w-2xl space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Set Count */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Number of Sets
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={setCount}
                      onChange={(e) => handleSetCountChange(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground"
                    />
                  </div>

                  {/* Exercise-level Intensity Type */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Intensity Type (All Sets)
                    </label>
                    <select
                      value={exerciseIntensityType}
                      onChange={(e) => setExerciseIntensityType(e.target.value as 'RIR' | 'RPE' | 'NONE')}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground"
                    >
                      <option value="NONE">None</option>
                      <option value="RIR">RIR (Reps in Reserve)</option>
                      <option value="RPE">RPE (Rate of Perceived Exertion)</option>
                    </select>
                  </div>
                </div>

                {/* Individual Set Configuration */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Set Configuration</h4>
                  <div className="space-y-3">
                    {sets.map((set, index) => (
                      <div key={set.setNumber} className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-12">
                            <span className="text-sm font-medium text-muted-foreground">Set {set.setNumber}</span>
                          </div>

                          {/* Reps */}
                          <div className="flex-1">
                            <label className="block text-xs text-muted-foreground mb-1">Reps</label>
                            <input
                              type="text"
                              value={set.reps}
                              onChange={(e) => handleSetUpdate(index, 'reps', e.target.value)}
                              placeholder="8-12"
                              className="w-full px-3 py-2 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground"
                            />
                          </div>

                          {/* Intensity Value */}
                          {exerciseIntensityType !== 'NONE' && (
                            <div className="flex-1">
                              <label className="block text-xs text-muted-foreground mb-1">
                                {exerciseIntensityType} Value
                              </label>
                              <input
                                type="number"
                                min={exerciseIntensityType === 'RIR' ? 0 : 1}
                                max={exerciseIntensityType === 'RIR' ? 5 : 10}
                                step={exerciseIntensityType === 'RPE' ? 0.5 : 1}
                                value={set.intensityValue || ''}
                                onChange={(e) => handleSetUpdate(index, 'intensityValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder={exerciseIntensityType === 'RIR' ? '0-5' : '1-10'}
                                className="w-full px-3 py-2 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground"
                              />
                            </div>
                          )}

                          {/* Duplicate Button - Only show when editing existing exercise */}
                          {editingExercise && set.id && (
                            <div className="flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDuplicateSet(set.id!)}
                                disabled={duplicatingSetId !== null}
                                className="p-2 text-primary hover:text-primary-hover hover:bg-primary-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <div className="mt-3 text-xs text-muted-foreground">
                    <p><strong>RIR:</strong> Reps in Reserve (0 = failure, 3 = could do 3 more reps)</p>
                    <p><strong>RPE:</strong> Rate of Perceived Exertion (1-10 scale, half values allowed)</p>
                  </div>
                </div>

                {/* Exercise Notes */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Exercise Notes (Optional)
                  </label>
                  <textarea
                    value={exerciseNotes}
                    onChange={(e) => setExerciseNotes(e.target.value)}
                    placeholder="Add any notes for this exercise (e.g., form cues, modifications, etc.)"
                    rows={3}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-muted text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-border bg-muted">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-foreground bg-card border border-input rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmExercise}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
                >
                  {editingExercise ? 'Update Exercise' : 'Add Exercise'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Exercise Search Interface */
          <>
            {/* Search */}
            <div className="p-6 border-b border-border">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground"
                />
              </div>

              {/* FAU Filters */}
              <div>
                <div className="text-sm font-medium text-foreground mb-2">Filter by Muscle Group:</div>
                <div className="flex flex-wrap gap-2">
                  {ALL_FAUS.map((fau) => (
                    <button
                      key={fau}
                      onClick={() => handleFAUToggle(fau)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        selectedFAUs.includes(fau)
                          ? 'bg-primary text-white border-primary'
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
            <div className="flex-1 overflow-auto p-6">
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
                      className="border border-border rounded-lg p-4 hover:border-primary transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground mb-2">{exercise.name}</h3>

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
                          className="ml-4 px-3 py-1 bg-primary text-white rounded hover:bg-primary-hover transition-colors flex items-center gap-1"
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