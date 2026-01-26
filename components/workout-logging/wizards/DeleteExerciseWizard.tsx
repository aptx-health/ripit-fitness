'use client'

import { useState, useCallback, useEffect } from 'react'
import { WizardDialog, WizardStep } from '@/components/ui/radix/wizard-dialog'
import { ScopeSelectionStep } from '../wizard-steps/ScopeSelectionStep'
import { LoadingSuccessStep } from '../wizard-steps/LoadingSuccessStep'

interface DeleteExerciseWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseId: string
  exerciseName: string
  onComplete: () => Promise<void>
}

export function DeleteExerciseWizard({
  open,
  onOpenChange,
  exerciseId,
  exerciseName,
  onComplete,
}: DeleteExerciseWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [applyToFuture, setApplyToFuture] = useState<boolean>(false)

  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Reset wizard state when opened
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setApplyToFuture(false)
      setIsLoading(false)
      setIsSuccess(false)
      setIsRefreshing(false)
      setErrorMessage(null)
    }
  }, [open])

  const handleScopeSelect = useCallback(
    async (applyToFutureValue: boolean) => {
      setApplyToFuture(applyToFutureValue)

      // Move to loading step
      setCurrentStep(1)
      setIsLoading(true)

      const startTime = Date.now()
      const MINIMUM_LOADING_TIME = 1500

      try {
        const response = await fetch(`/api/exercises/${exerciseId}/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applyToFuture: applyToFutureValue,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to delete exercise')
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
        console.error('Error deleting exercise:', error)
        setIsLoading(false)
        setIsSuccess(false)
        setErrorMessage(error instanceof Error ? error.message : 'Failed to delete exercise')

        // Show error for 2 seconds, then close
        await new Promise((resolve) => setTimeout(resolve, 2000))
        onOpenChange(false)
      }
    },
    [exerciseId, onComplete, onOpenChange]
  )

  const steps: WizardStep[] = [
    {
      id: 'scope',
      title: 'Delete Exercise',
      description: `Remove "${exerciseName}" from your workout`,
      component: (
        <ScopeSelectionStep
          actionType="delete"
          exerciseName={exerciseName}
          onSelect={handleScopeSelect}
        />
      ),
      canGoBack: false,
      canGoNext: false, // Selection triggers API call
    },
    {
      id: 'loading',
      title: isLoading ? 'Deleting Exercise' : isSuccess ? 'Success!' : isRefreshing ? 'Refreshing' : 'Error',
      component: (
        <LoadingSuccessStep
          isLoading={isLoading || isRefreshing}
          isSuccess={isSuccess}
          loadingMessage={isRefreshing ? "Refreshing workout..." : "Deleting exercise..."}
          successMessage={`Exercise deleted${applyToFuture ? ' from all future workouts' : ''}!`}
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
      title="Delete Exercise"
    />
  )
}
