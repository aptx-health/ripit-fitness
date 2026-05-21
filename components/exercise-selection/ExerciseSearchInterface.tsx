'use client'

import { Check, Filter, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'
import { FilterChoiceSheet } from './FilterChoiceSheet'

export type ExerciseDefinition = {
  id: string
  name: string
  primaryFAUs: string[]
  secondaryFAUs: string[]
  equipment: string[]
  instructions?: string
  isSystem?: boolean
  createdBy?: string | null
}

interface ExerciseSearchInterfaceProps {
  onExerciseSelect: (exercise: ExerciseDefinition) => void
  initialQuery?: string
  preloadExercises?: boolean
  onCreateExercise?: (searchQuery: string) => void
  onEditExercise?: (exercise: ExerciseDefinition) => void
  /**
   * When provided, the picker switches to multi-select mode: cards highlight
   * when their id is in the set, and clicking a card (or its button) toggles
   * selection via onExerciseSelect rather than emitting once and closing.
   */
  selectedIds?: Set<string>
}

const ALL_FAUS = [
  'chest', 'mid-back', 'lower-back', 'front-delts', 'side-delts', 'rear-delts',
  'lats', 'traps', 'biceps', 'triceps', 'forearms',
  'quads', 'adductors', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques'
]

const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'smith_machine',
  'bodyweight',
  'resistance_band',
  'kettlebell',
  'other'
]

const EQUIPMENT_DISPLAY_NAMES: Record<string, string> = {
  'barbell': 'Barbell',
  'dumbbell': 'Dumbbell',
  'cable': 'Cable',
  'machine': 'Machine',
  'smith_machine': 'Smith Machine',
  'bodyweight': 'Bodyweight',
  'resistance_band': 'Resistance Band',
  'kettlebell': 'Kettlebell',
  'other': 'Other (specialized equipment)'
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

export function ExerciseSearchInterface({
  onExerciseSelect,
  initialQuery = '',
  preloadExercises = false,
  onCreateExercise,
  onEditExercise,
  selectedIds,
}: ExerciseSearchInterfaceProps) {
  const isMultiSelect = selectedIds !== undefined
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedFAU, setSelectedFAU] = useState<string | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null)
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(preloadExercises)
  const [fauSheetOpen, setFauSheetOpen] = useState(false)
  const [equipmentSheetOpen, setEquipmentSheetOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const fauOptions = useMemo(
    () => [
      { value: null, label: 'All Muscle Groups' },
      ...ALL_FAUS.map((fau) => ({ value: fau, label: FAU_DISPLAY_NAMES[fau] || fau })),
    ],
    [],
  )
  const equipmentOptions = useMemo(
    () => [
      { value: null, label: 'All Equipment' },
      ...EQUIPMENT_TYPES.map((eq) => ({ value: eq, label: EQUIPMENT_DISPLAY_NAMES[eq] || eq })),
    ],
    [],
  )

  // Auto-focus the search input on devices with a physical keyboard (desktop)
  // but NOT on touch devices, where focusing pops up the on-screen keyboard
  // and obscures the page. Touch users tap the field to bring it up.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersKeyboard = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (prefersKeyboard) {
      searchInputRef.current?.focus()
    }
  }, [])

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
      clientLogger.error('Error searching exercises:', error)
      setError(error instanceof Error ? error.message : 'Failed to search exercises')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, selectedFAU, selectedEquipment])

  // Search when query/filters change (respecting preloadExercises)
  useEffect(() => {
    if (preloadExercises || searchQuery.trim() || selectedFAU || selectedEquipment) {
      searchExercises()
    }
  }, [searchQuery, selectedFAU, selectedEquipment, preloadExercises, searchExercises])

  const handleFAUSelect = useCallback((fau: string | null) => {
    setSelectedFAU(fau)
  }, [])

  const handleEquipmentSelect = useCallback((equipment: string | null) => {
    setSelectedEquipment(equipment)
  }, [])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search */}
      <div className="px-4 sm:px-6 py-4 border-b-2 border-border flex-shrink-0">
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            ref={searchInputRef}
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
          <button
            type="button"
            onClick={() => setFauSheetOpen(true)}
            className="w-full px-4 py-2 border-2 border-input hover:border-primary focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground text-left font-bold"
          >
            {selectedFAU ? FAU_DISPLAY_NAMES[selectedFAU] : 'All Muscle Groups'}
          </button>
        </div>

        {/* Equipment Filter */}
        <div className="mt-3">
          <div className="text-sm font-bold text-foreground mb-2 tracking-wide">Filter by Equipment:</div>
          <button
            type="button"
            onClick={() => setEquipmentSheetOpen(true)}
            className="w-full px-4 py-2 border-2 border-input hover:border-primary focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-card text-foreground text-left font-bold"
          >
            {selectedEquipment ? EQUIPMENT_DISPLAY_NAMES[selectedEquipment] : 'All Equipment'}
          </button>
        </div>
      </div>

      <FilterChoiceSheet
        open={fauSheetOpen}
        onOpenChange={setFauSheetOpen}
        title="Filter by Muscle Group"
        options={fauOptions}
        selected={selectedFAU}
        onSelect={handleFAUSelect}
      />
      <FilterChoiceSheet
        open={equipmentSheetOpen}
        onOpenChange={setEquipmentSheetOpen}
        title="Filter by Equipment"
        options={equipmentOptions}
        selected={selectedEquipment}
        onSelect={handleEquipmentSelect}
      />

      {/* Results */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 py-4 min-h-0">
        {error && (
          <div className="bg-error-muted border-2 border-error p-4 mb-4">
            <div className="text-error font-bold">{error}</div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground font-bold tracking-wide">SEARCHING EXERCISES...</div>
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-8">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-4">
                <Search size={32} className="text-muted-foreground/60" />
                <Filter size={32} className="text-muted-foreground/60" />
              </div>
              <div className="font-bold tracking-wide">
                ENTER A SEARCH TERM OR SELECT A FILTER TO FIND EXERCISES
              </div>
            </div>
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground font-bold tracking-wide">
              NO EXERCISES FOUND MATCHING YOUR SEARCH
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {exercises.map((exercise) => {
              const isSelected = isMultiSelect && selectedIds?.has(exercise.id)
              return (
              <div
                key={exercise.id}
                {...(isMultiSelect && {
                  role: 'button',
                  tabIndex: 0,
                  'aria-pressed': !!isSelected,
                  onClick: () => onExerciseSelect(exercise),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onExerciseSelect(exercise)
                    }
                  },
                })}
                className={`border-2 p-4 transition-all bg-card ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.35)]'
                    : 'border-border hover:border-primary hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]'
                } ${isMultiSelect ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground mb-2 tracking-wide uppercase">{exercise.name}</h3>

                    {exercise.primaryFAUs.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-bold text-muted-foreground">Primary: </span>
                        <span className="text-sm text-foreground">{exercise.primaryFAUs.map(fau => FAU_DISPLAY_NAMES[fau] || fau).join(', ')}</span>
                      </div>
                    )}

                    {exercise.secondaryFAUs.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-bold text-muted-foreground">Secondary: </span>
                        <span className="text-sm text-foreground">{exercise.secondaryFAUs.map(fau => FAU_DISPLAY_NAMES[fau] || fau).join(', ')}</span>
                      </div>
                    )}

                    {exercise.equipment.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-bold text-muted-foreground">Equipment: </span>
                        <span className="text-sm text-foreground">{exercise.equipment.map(eq => EQUIPMENT_LABELS[eq] || eq.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    {onEditExercise && !exercise.isSystem && (
                      <button type="button"
                        onClick={() => onEditExercise(exercise)}
                        className="px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary-hover font-bold uppercase tracking-wider text-sm border-2 border-border transition-colors"
                        title="Edit custom exercise"
                      >
                        Edit
                      </button>
                    )}
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); onExerciseSelect(exercise) }}
                      aria-pressed={isMultiSelect ? !!isSelected : undefined}
                      className={
                        isSelected
                          ? 'px-4 py-2 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm border-2 border-primary-active flex items-center gap-1.5'
                          : 'px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover font-bold uppercase tracking-wider text-sm border-2 border-primary-active shadow-[0_3px_0_var(--primary-active),0_5px_8px_rgba(0,0,0,0.4)] hover:shadow-[0_3px_0_var(--primary-active),0_0_20px_rgba(var(--primary-rgb),0.6)] active:translate-y-[3px] active:shadow-[0_0_0_var(--primary-active),0_2px_4px_rgba(0,0,0,0.4)] transition-all'
                      }
                    >
                      {isSelected ? (
                        <>
                          <Check size={16} strokeWidth={3} />
                          Added
                        </>
                      ) : isMultiSelect ? 'Add' : 'Select'}
                    </button>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Fixed Footer - Create New Exercise */}
      {onCreateExercise && (
        <div className="border-t-2 border-border bg-muted/30 px-4 sm:px-6 py-3 flex-shrink-0">
          <button type="button"
            onClick={() => onCreateExercise(searchQuery)}
            className="w-full px-4 py-2 bg-accent text-accent-foreground hover:bg-accent-hover font-bold uppercase tracking-wider text-sm border-2 border-accent transition-colors"
          >
            + Create New Exercise
          </button>
        </div>
      )}
    </div>
  )
}
