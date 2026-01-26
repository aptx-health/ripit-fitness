'use client'

import { useState, useCallback, useEffect } from 'react'
import { WizardDialog, WizardStep } from '@/components/ui/radix/wizard-dialog'
import {
  ExerciseSearchStep,
  ExerciseDefinition,
} from '../wizard-steps/ExerciseSearchStep'
import {
  SetConfigurationStep,
  ExercisePrescription,
} from '../wizard-steps/SetConfigurationStep'
import { ScopeSelectionStep } from '../wizard-steps/ScopeSelectionStep'
import { LoadingSuccessStep } from '../wizard-steps/LoadingSuccessStep'

interface AddExerciseWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workoutId: string
  workoutCompletionId?: string | null
  onComplete: () => Promise<void>
}

export function AddExerciseWizard({
  open,
  onOpenChange,
  workoutId,
  workoutCompletionId,
  onComplete,
}: AddExerciseWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null)
  const [prescription, setPrescription] = useState<ExercisePrescription | null>(null)
  const [applyToFuture, setApplyToFuture] = useState<boolean>(false)

  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Reset wizard state when opened
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setSelectedExercise(null)
      setPrescription(null)
      setApplyToFuture(false)
      setIsLoading(false)
      setIsSuccess(false)
      setIsRefreshing(false)
      setErrorMessage(null)
    }
  }, [open])

  const handleExerciseSelect = useCallback((exercise: ExerciseDefinition) => {
    setSelectedExercise(exercise)
    setCurrentStep(1) // Auto-advance to configuration step
  }, [])

  const handleConfigChange = useCallback((config: ExercisePrescription) => {
    setPrescription(config)
  }, [])

  const handleScopeSelect = useCallback(
    async (applyToFutureValue: boolean) => {
      setApplyToFuture(applyToFutureValue)

      // Move to loading step
      setCurrentStep(3)
      setIsLoading(true)

      const startTime = Date.now()
      const MINIMUM_LOADING_TIME = 1500

      try {
        if (!selectedExercise || !prescription) {
          throw new Error('Missing exercise or prescription data')
        }

        const response = await fetch(`/api/workouts/${workoutId}/exercises/add-during-logging`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exerciseDefinitionId: selectedExercise.id,
            applyToFuture: applyToFutureValue,
            workoutCompletionId: applyToFutureValue ? undefined : workoutCompletionId,
            prescribedSets: prescription.sets,
            notes: prescription.notes,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to add exercise')
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
        console.error('Error adding exercise:', error)
        setIsLoading(false)
        setIsSuccess(false)
        setErrorMessage(error instanceof Error ? error.message : 'Failed to add exercise')

        // Show error for 2 seconds, then close
        await new Promise((resolve) => setTimeout(resolve, 2000))
        onOpenChange(false)
      }
    },
    [selectedExercise, prescription, workoutId, workoutCompletionId, onComplete, onOpenChange]
  )

  const steps: WizardStep[] = [
    {
      id: 'search',
      title: 'Search Exercises',
      description: 'Find an exercise to add to your workout',
      component: <ExerciseSearchStep onSelect={handleExerciseSelect} />,
      canGoBack: false,
      canGoNext: false, // Auto-advances on selection
    },
    {
      id: 'configure',
      title: 'Configure Exercise',
      description: selectedExercise ? selectedExercise.name : 'Configure sets and intensity',
      component: selectedExercise ? (
        <SetConfigurationStep
          exercise={selectedExercise}
          onConfigChange={handleConfigChange}
        />
      ) : null,
      canGoBack: true,
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
      onBack: () => {
        setCurrentStep(0)
        setSelectedExercise(null)
        setPrescription(null)
      },
    },
    {
      id: 'scope',
      title: 'Apply Changes',
      description: 'Choose where to add this exercise',
      component: selectedExercise ? (
        <ScopeSelectionStep
          actionType="add"
          exerciseName={selectedExercise.name}
          onSelect={handleScopeSelect}
        />
      ) : null,
      canGoBack: true,
      canGoNext: false, // Selection triggers API call
      onBack: () => {
        setCurrentStep(1)
      },
    },
    {
      id: 'loading',
      title: isLoading ? 'Adding Exercise' : isSuccess ? 'Success!' : isRefreshing ? 'Refreshing' : 'Error',
      component: (
        <LoadingSuccessStep
          isLoading={isLoading || isRefreshing}
          isSuccess={isSuccess}
          loadingMessage={isRefreshing ? "Refreshing workout..." : "Adding exercise to workout..."}
          successMessage={`Exercise added${applyToFuture ? ' to all future workouts' : ''}!`}
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
      title="Add Exercise"
    />
  )
}
