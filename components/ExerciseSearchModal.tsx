'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useUserSettings } from '@/hooks/useUserSettings'
import { ExerciseSearchInterface, ExerciseDefinition } from '@/components/exercise-selection/ExerciseSearchInterface'
import { SetConfigurationInterface, ExercisePrescription } from '@/components/exercise-selection/SetConfigurationInterface'

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

export default function ExerciseSearchModal({
  isOpen,
  onClose,
  onExerciseSelect,
  editingExercise
}: ExerciseSearchModalProps) {
  const { settings } = useUserSettings()
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null)
  const [prescription, setPrescription] = useState<ExercisePrescription | null>(null)

  // Initialize state when editing
  useEffect(() => {
    if (!editingExercise) {
      setSelectedExercise(null)
      setPrescription(null)
      return
    }

    // Determine intensity type from prescribed sets
    const firstSet = editingExercise.prescribedSets[0]
    let intensityType: 'RIR' | 'RPE' | 'NONE' = 'NONE'
    if (firstSet?.rpe !== null && firstSet?.rpe !== undefined) {
      intensityType = 'RPE'
    } else if (firstSet?.rir !== null && firstSet?.rir !== undefined) {
      intensityType = 'RIR'
    }

    setSelectedExercise({
      ...editingExercise.exerciseDefinition,
      equipment: [],
      instructions: undefined
    })

    // Don't set prescription here - SetConfigurationInterface will handle it via initialConfig
  }, [editingExercise])

  const handleExerciseSelect = useCallback((exercise: ExerciseDefinition) => {
    setSelectedExercise(exercise)
  }, [])

  const handleConfigChange = useCallback((config: ExercisePrescription) => {
    setPrescription(config)
  }, [])

  const handleConfirmExercise = useCallback(() => {
    if (!selectedExercise || !prescription) return

    // Validate all rep inputs before submitting
    const hasEmptyReps = prescription.sets.some(set => !set.reps.trim())
    if (hasEmptyReps) {
      alert('Please configure reps for all sets')
      return
    }

    onExerciseSelect(selectedExercise, prescription)

    // Reset form
    setSelectedExercise(null)
    setPrescription(null)
    onClose()
  }, [selectedExercise, prescription, onExerciseSelect, onClose])

  const handleBackToSearch = useCallback(() => {
    setSelectedExercise(null)
    setPrescription(null)
  }, [])

  const handleClose = useCallback(() => {
    setSelectedExercise(null)
    setPrescription(null)
    onClose()
  }, [onClose])

  if (!isOpen) return null

  // Prepare initial config for editing
  const initialConfig = editingExercise ? {
    sets: editingExercise.prescribedSets.map(set => {
      const firstSet = editingExercise.prescribedSets[0]
      const intensityType = firstSet?.rpe !== null && firstSet?.rpe !== undefined ? 'RPE'
        : firstSet?.rir !== null && firstSet?.rir !== undefined ? 'RIR'
        : 'NONE'

      return {
        id: set.id,
        setNumber: set.setNumber,
        reps: set.reps,
        intensityValue: intensityType === 'RPE' ? (set.rpe ?? undefined)
          : intensityType === 'RIR' ? (set.rir ?? undefined)
          : undefined
      }
    }),
    intensityType: (() => {
      const firstSet = editingExercise.prescribedSets[0]
      return firstSet?.rpe !== null && firstSet?.rpe !== undefined ? 'RPE' as const
        : firstSet?.rir !== null && firstSet?.rir !== undefined ? 'RIR' as const
        : 'NONE' as const
    })(),
    notes: editingExercise.notes || ''
  } : undefined

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
          /* Exercise Configuration Interface */
          <>
            <SetConfigurationInterface
              exercise={selectedExercise || {
                ...editingExercise!.exerciseDefinition,
                equipment: [],
                instructions: undefined
              }}
              initialConfig={initialConfig}
              onConfigChange={handleConfigChange}
            />

            {/* Actions */}
            <div className="p-4 border-t-2 border-border bg-muted">
              <div className="flex gap-3 justify-end">
                {!editingExercise && (
                  <button
                    onClick={handleBackToSearch}
                    className="px-6 py-3 text-secondary-foreground bg-secondary border-2 border-secondary hover:bg-secondary-hover font-bold uppercase tracking-wider transition-all shadow-[0_3px_0_var(--secondary-active),0_5px_8px_rgba(0,0,0,0.4)] hover:shadow-[0_3px_0_var(--secondary-active),0_0_20px_rgba(0,0,0,0.6)] active:translate-y-[3px] active:shadow-[0_0_0_var(--secondary-active),0_2px_4px_rgba(0,0,0,0.4)]"
                  >
                    Back
                  </button>
                )}
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
            <ExerciseSearchInterface
              onExerciseSelect={handleExerciseSelect}
              preloadExercises={false}
            />
          </>
        )}
      </div>
    </div>
  )
}
