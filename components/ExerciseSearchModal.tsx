'use client'

import { X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { type ExerciseDefinition, ExerciseSearchInterface } from '@/components/exercise-selection/ExerciseSearchInterface'
import { type ExercisePrescription, SetConfigurationInterface } from '@/components/exercise-selection/SetConfigurationInterface'
import ExerciseDefinitionEditorModal from '@/components/features/exercise-definition/ExerciseDefinitionEditorModal'
import { Button } from '@/components/ui/Button'
import { useUserSettings } from '@/hooks/useUserSettings'

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
    isSystem?: boolean
    createdBy?: string | null
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
  const { settings: _settings } = useUserSettings()
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null)
  const [prescription, setPrescription] = useState<ExercisePrescription | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createInitialName, setCreateInitialName] = useState('')
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null)
  const [editingExerciseDefinitionId, setEditingExerciseDefinitionId] = useState<string | null>(null)

  // Derive effective exercise: user-selected exercise takes priority, then editing exercise
  const effectiveExercise = useMemo(() => {
    return selectedExercise ?? (editingExercise ? {
      ...editingExercise.exerciseDefinition,
      equipment: [] as string[],
      instructions: undefined as string | undefined
    } : null)
  }, [selectedExercise, editingExercise])

  const handleExerciseSelect = useCallback((exercise: ExerciseDefinition) => {
    setSelectedExercise(exercise)
  }, [])

  const handleConfigChange = useCallback((config: ExercisePrescription) => {
    setPrescription(config)
  }, [])

  const handleConfirmExercise = useCallback(() => {
    if (!effectiveExercise || !prescription) return

    // Validate all rep inputs before submitting
    const hasEmptyReps = prescription.sets.some(set => !set.reps.trim())
    if (hasEmptyReps) {
      alert('Please configure reps for all sets')
      return
    }

    onExerciseSelect(effectiveExercise, prescription)

    // Reset form
    setSelectedExercise(null)
    setPrescription(null)
    onClose()
  }, [effectiveExercise, prescription, onExerciseSelect, onClose])

  const handleBackToSearch = useCallback(() => {
    setSelectedExercise(null)
    setPrescription(null)
  }, [])

  const handleClose = useCallback(() => {
    setSelectedExercise(null)
    setPrescription(null)
    onClose()
  }, [onClose])

  const handleCreateExercise = useCallback((searchQuery: string) => {
    setCreateInitialName(searchQuery)
    setEditingExerciseId(null)
    setShowCreateModal(true)
  }, [])

  const handleEditExercise = useCallback((exercise: ExerciseDefinition) => {
    setEditingExerciseId(exercise.id)
    setCreateInitialName('')
    setShowCreateModal(true)
  }, [])

  const handleCreateSuccess = useCallback((newExercise: ExerciseDefinition) => {
    setShowCreateModal(false)
    setEditingExerciseId(null)
    setSelectedExercise(newExercise)
  }, [])

  const handleEditExerciseDefinition = useCallback(() => {
    if (effectiveExercise) {
      setEditingExerciseDefinitionId(effectiveExercise.id)
    }
  }, [effectiveExercise])

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
    <>
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      className="backdrop-blur-md bg-background/80 flex items-center justify-center p-0 sm:p-4"
    >
      <div
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
        className="bg-card border-4 border-border w-full h-full sm:h-auto sm:w-[90vw] sm:max-w-3xl sm:max-h-[85vh] flex flex-col mx-auto doom-card pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-border bg-primary text-primary-foreground">
          <h2 className="text-xl font-bold tracking-wide uppercase">
            {editingExercise ? 'Edit Exercise' : effectiveExercise ? 'Configure Exercise' : 'Add Exercise'}
          </h2>
          <button type="button"
            onClick={handleClose}
            className="text-primary-foreground/80 hover:text-primary-foreground"
          >
            <X size={24} />
          </button>
        </div>

        {effectiveExercise ? (
          /* Exercise Configuration Interface */
          <>
            <SetConfigurationInterface
              exercise={effectiveExercise}
              initialConfig={initialConfig}
              onConfigChange={handleConfigChange}
              isSystemExercise={effectiveExercise.isSystem ?? true}
              onEditExercise={handleEditExerciseDefinition}
            />

            {/* Actions */}
            <div className="px-4 sm:px-6 py-4 border-t-2 border-border bg-muted/30">
              <div className="flex gap-3 justify-end">
                {!editingExercise && (
                  <Button variant="secondary" onClick={handleBackToSearch} doom>
                    Back
                  </Button>
                )}
                <Button variant="secondary" onClick={handleClose} doom>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleConfirmExercise} doom>
                  {editingExercise ? 'Update Exercise' : 'Add Exercise'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Exercise Search Interface */
          <ExerciseSearchInterface
              onExerciseSelect={handleExerciseSelect}
              preloadExercises={false}
              onCreateExercise={handleCreateExercise}
              onEditExercise={handleEditExercise}
            />
        )}
      </div>
    </div>

    {/* Exercise Definition Editor Modal - Create/Edit from Search */}
    <ExerciseDefinitionEditorModal
      isOpen={showCreateModal}
      onClose={() => {
        setShowCreateModal(false)
        setEditingExerciseId(null)
      }}
      mode={editingExerciseId ? 'edit' : 'create'}
      exerciseId={editingExerciseId || undefined}
      initialName={createInitialName}
      onSuccess={handleCreateSuccess}
    />

    {/* Exercise Definition Editor Modal - Edit from Set Configuration */}
    <ExerciseDefinitionEditorModal
      isOpen={!!editingExerciseDefinitionId}
      onClose={() => setEditingExerciseDefinitionId(null)}
      mode="edit"
      exerciseId={editingExerciseDefinitionId || undefined}
      onSuccess={() => {
        setEditingExerciseDefinitionId(null)
        // Optionally refresh the selected exercise data here
      }}
    />
    </>
  )
}
