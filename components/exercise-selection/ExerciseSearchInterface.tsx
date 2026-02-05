'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Filter } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/radix/popover'

export type ExerciseDefinition = {
  id: string
  name: string
  primaryFAUs: string[]
  secondaryFAUs: string[]
  equipment: string[]
  instructions?: string
}

interface ExerciseSearchInterfaceProps {
  onExerciseSelect: (exercise: ExerciseDefinition) => void
  initialQuery?: string
  preloadExercises?: boolean
}

const ALL_FAUS = [
  'chest', 'mid-back', 'lower-back', 'front-delts', 'side-delts', 'rear-delts',
  'lats', 'traps', 'biceps', 'triceps', 'forearms',
  'quads', 'adductors', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques'
]

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
  preloadExercises = false
}: ExerciseSearchInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedFAU, setSelectedFAU] = useState<string | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null)
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(preloadExercises)

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
    <>
      {/* Search */}
      <div className="px-4 sm:px-6 py-4 border-b-2 border-border">
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
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="border-2 border-border p-4 hover:border-primary transition-all hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] bg-card"
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
                        <span className="text-sm text-foreground">{exercise.equipment.join(', ')}</span>
                      </div>
                    )}

                    {exercise.instructions && (
                      <div className="text-sm text-muted-foreground mt-2">
                        {exercise.instructions}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onExerciseSelect(exercise)}
                    className="ml-4 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover font-bold uppercase tracking-wider text-sm border-2 border-primary-active shadow-[0_3px_0_var(--primary-active),0_5px_8px_rgba(0,0,0,0.4)] hover:shadow-[0_3px_0_var(--primary-active),0_0_20px_rgba(var(--primary-rgb),0.6)] active:translate-y-[3px] active:shadow-[0_0_0_var(--primary-active),0_2px_4px_rgba(0,0,0,0.4)] transition-all flex-shrink-0"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
