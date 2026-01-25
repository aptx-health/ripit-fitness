'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus } from 'lucide-react'

export type ExerciseDefinition = {
  id: string
  name: string
  primaryFAUs: string[]
  secondaryFAUs: string[]
  equipment: string[]
  instructions?: string
}

interface ExerciseSearchStepProps {
  onSelect: (exercise: ExerciseDefinition) => void
}

const ALL_FAUS = [
  'chest',
  'mid-back',
  'lower-back',
  'front-delts',
  'side-delts',
  'rear-delts',
  'lats',
  'traps',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'adductors',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'obliques',
]

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

export function ExerciseSearchStep({ onSelect }: ExerciseSearchStepProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFAUs, setSelectedFAUs] = useState<string[]>([])
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    searchExercises()
  }, [searchExercises])

  const handleFAUToggle = useCallback((fau: string) => {
    setSelectedFAUs((prev) => (prev.includes(fau) ? prev.filter((f) => f !== fau) : [...prev, fau]))
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="mb-4">
        <div className="relative mb-4">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-zinc-800 text-white"
          />
        </div>

        {/* FAU Filters */}
        <div>
          <div className="text-sm font-medium text-orange-50 mb-2">Filter by Muscle Group:</div>
          <div className="flex flex-wrap gap-2">
            {ALL_FAUS.map((fau) => (
              <button
                key={fau}
                onClick={() => handleFAUToggle(fau)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  selectedFAUs.includes(fau)
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-zinc-700 text-zinc-300 border-zinc-600 hover:border-orange-500'
                }`}
              >
                {FAU_DISPLAY_NAMES[fau] || fau}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="bg-red-950 border border-red-600 rounded-lg p-4 mb-4">
            <div className="text-red-400">{error}</div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-zinc-400">Searching exercises...</div>
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-zinc-400">
              {searchQuery || selectedFAUs.length > 0
                ? 'No exercises found matching your search'
                : 'No exercises available'}
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="border border-zinc-700 rounded-lg p-4 hover:border-orange-500 transition-colors bg-zinc-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-orange-50 mb-2">{exercise.name}</h3>

                    {exercise.primaryFAUs.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm text-zinc-400">Primary: </span>
                        <span className="text-sm text-zinc-300">
                          {exercise.primaryFAUs.map((fau) => FAU_DISPLAY_NAMES[fau] || fau).join(', ')}
                        </span>
                      </div>
                    )}

                    {exercise.secondaryFAUs.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm text-zinc-400">Secondary: </span>
                        <span className="text-sm text-zinc-300">
                          {exercise.secondaryFAUs
                            .map((fau) => FAU_DISPLAY_NAMES[fau] || fau)
                            .join(', ')}
                        </span>
                      </div>
                    )}

                    {exercise.equipment.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm text-zinc-400">Equipment: </span>
                        <span className="text-sm text-zinc-300">{exercise.equipment.join(', ')}</span>
                      </div>
                    )}

                    {exercise.instructions && (
                      <div className="text-sm text-zinc-400 mt-2">{exercise.instructions}</div>
                    )}
                  </div>

                  <button
                    onClick={() => onSelect(exercise)}
                    className="ml-4 px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors flex items-center gap-1 flex-shrink-0"
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
    </div>
  )
}
