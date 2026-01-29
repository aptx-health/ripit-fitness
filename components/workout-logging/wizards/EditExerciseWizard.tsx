'use client'

import { useState, useCallback, useEffect } from 'react'
import { WizardDialog, WizardStep } from '@/components/ui/radix/wizard-dialog'
import {
  SetConfigurationStep,
  ExercisePrescription,
} from '../wizard-steps/SetConfigurationStep'
import { ScopeSelectionStep } from '../wizard-steps/ScopeSelectionStep'
import { LoadingSuccessStep } from '../wizard-steps/LoadingSuccessStep'
import type { ExerciseDefinition } from '../wizard-steps/ExerciseSearchStep'

interface PrescribedSet {
  id: string
  setNumber: number
  reps: string
  weight: string | null
  rpe: number | null
  rir: number | null
}

interface Exercise {
  id: string
  name: string
  notes: string | null
  prescribedSets: PrescribedSet[]
  exerciseDefinition?: {
    id: string
    name: string
    primaryFAUs: string[]
    secondaryFAUs: string[]
    equipment: string[]
    instructions?: string
  }
}

interface EditExerciseWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercise: Exercise
  onComplete: () => Promise<void>
}

export function EditExerciseWizard({
  open,
  onOpenChange,
  exercise,
  onComplete,
}: EditExerciseWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [prescription, setPrescription] = useState<ExercisePrescription | null>(null)
  const [applyToFuture, setApplyToFuture] = useState<boolean>(false)

  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Convert exercise data to ExerciseDefinition format
  const exerciseDefinition: ExerciseDefinition = {
    id: exercise.exerciseDefinition?.id || exercise.id,
    name: exercise.name,
    primaryFAUs: exercise.exerciseDefinition?.primaryFAUs || [],
    secondaryFAUs: exercise.exerciseDefinition?.secondaryFAUs || [],
    equipment: exercise.exerciseDefinition?.equipment || [],
    instructions: exercise.exerciseDefinition?.instructions,
  }

  // Determine initial intensity type from prescribed sets
  const getInitialIntensityType = (): 'RIR' | 'RPE' | 'NONE' => {
    const firstSet = exercise.prescribedSets[0]
    if (!firstSet) return 'NONE'

    if (firstSet.rpe !== null && firstSet.rpe !== undefined) return 'RPE'
    if (firstSet.rir !== null && firstSet.rir !== undefined) return 'RIR'
    return 'NONE'
  }

  const initialConfig = {
    setCount: exercise.prescribedSets.length,
    intensityType: getInitialIntensityType(),
    notes: exercise.notes || '',
    sets: exercise.prescribedSets.map((set) => ({
      id: set.id,
      setNumber: set.setNumber,
      reps: set.reps,
      intensityValue:
        getInitialIntensityType() === 'RPE'
          ? set.rpe ?? undefined
          : getInitialIntensityType() === 'RIR'
          ? set.rir ?? undefined
          : undefined,
    })),
  }

  // Reset wizard state when opened
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setPrescription(null)
      setApplyToFuture(false)
      setIsLoading(false)
      setIsSuccess(false)
      setIsRefreshing(false)
      setErrorMessage(null)
    }
  }, [open])

  const handleConfigChange = useCallback((config: ExercisePrescription) => {
    setPrescription(config)
  }, [])

  const handleScopeSelect = useCallback(
    async (applyToFutureValue: boolean) => {
      setApplyToFuture(applyToFutureValue)

      // Move to loading step
      setCurrentStep(2)
      setIsLoading(true)

      const startTime = Date.now()
      const MINIMUM_LOADING_TIME = 1500

      try {
        if (!prescription) {
          throw new Error('Missing prescription data')
        }

        const response = await fetch(`/api/exercises/${exercise.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: prescription.notes,
            applyToFuture: applyToFutureValue,
            prescribedSets: prescription.sets.map((set) => ({
              setNumber: set.setNumber,
              reps: set.reps,
              rpe: set.intensityType === 'RPE' ? set.intensityValue : null,
              rir: set.intensityType === 'RIR' ? set.intensityValue : null,
            })),
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update exercise')
        }

        const data = await response.json()

        // Ensure minimum loading time
        const elapsedTime = Date.now() - startTime
        const remainingTime = Math.max(0, MINIMUM_LOADING_TIME - elapsedTime)
        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime))
        }

        // Show success
        setIsLoading(false)
        setIsSuccess(true)

        // Wait 1 second to show success message
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Show refreshing state
        setIsSuccess(false)
        setIsRefreshing(true)

        // Refresh workout data
        await onComplete()

        // Close wizard after refresh completes
        onOpenChange(false)
      } catch (error) {
        console.error('Error updating exercise:', error)
        setIsLoading(false)
        setIsSuccess(false)
        setErrorMessage(error instanceof Error ? error.message : 'Failed to update exercise')

        // Show error for 2 seconds, then close
        await new Promise((resolve) => setTimeout(resolve, 2000))
        onOpenChange(false)
      }
    },
    [prescription, exercise.id, onComplete, onOpenChange]
  )

  const steps: WizardStep[] = [
    {
      id: 'configure',
      title: 'Edit Exercise',
      description: exercise.name,
      component: (
        <SetConfigurationStep
          exercise={exerciseDefinition}
          initialConfig={initialConfig}
          onConfigChange={handleConfigChange}
        />
      ),
      canGoBack: false,
      canGoNext: true,
      nextLabel: 'Continue',
      onNext: () => {
        // Validate that we have at least one set
        if (!prescription || prescription.sets.length === 0) {
          alert('Please configure at least one set')
          return false
        }
        return true
      },
    },
    {
      id: 'scope',
      title: 'Apply Changes',
      description: 'Choose where to update this exercise',
      component: (
        <ScopeSelectionStep
          actionType="edit"
          exerciseName={exercise.name}
          onSelect={handleScopeSelect}
        />
      ),
      canGoBack: true,
      canGoNext: false, // Selection triggers API call
      onBack: () => {
        setCurrentStep(0)
      },
    },
    {
      id: 'loading',
      title: isLoading ? 'Updating Exercise' : isSuccess ? 'Success!' : isRefreshing ? 'Refreshing' : 'Error',
      component: (
        <LoadingSuccessStep
          isLoading={isLoading || isRefreshing}
          isSuccess={isSuccess}
          loadingMessage={isRefreshing ? "Refreshing workout..." : "Updating exercise..."}
          successMessage={`Exercise updated${applyToFuture ? ' in all future workouts' : ''}!`}
        />
      ),
      canGoBack: false,
      canGoNext: false,
    },
  ]

  return (
    <WizardDialog
      open={open}
      onOpenChange={onOpenChange}
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      title="Edit Exercise"
    />
  )
}
