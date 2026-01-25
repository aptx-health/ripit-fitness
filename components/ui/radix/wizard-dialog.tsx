'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from './dialog'
import { Button } from '@/components/ui/Button'
import { ChevronLeft, X } from 'lucide-react'

export interface WizardStep {
  id: string
  title: string
  description?: string
  component: React.ReactNode
  canGoBack?: boolean
  canGoNext?: boolean
  nextLabel?: string
  onNext?: () => Promise<boolean> | boolean
  onBack?: () => void
}

export interface WizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  steps: WizardStep[]
  currentStep: number
  onStepChange: (step: number) => void
  title: string
}

export function WizardDialog({
  open,
  onOpenChange,
  steps,
  currentStep,
  onStepChange,
  title,
}: WizardDialogProps) {
  const [isProcessing, setIsProcessing] = React.useState(false)

  const step = steps[currentStep]

  const handleBack = async () => {
    if (step.onBack) {
      step.onBack()
    }
    onStepChange(currentStep - 1)
  }

  const handleNext = async () => {
    if (step.onNext) {
      setIsProcessing(true)
      try {
        const canProceed = await step.onNext()
        if (canProceed) {
          onStepChange(currentStep + 1)
        }
      } catch (error) {
        console.error('Wizard step validation failed:', error)
      } finally {
        setIsProcessing(false)
      }
    } else {
      onStepChange(currentStep + 1)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const showBackButton = step.canGoBack && currentStep > 0
  const showNextButton = step.canGoNext && currentStep < steps.length - 1
  const isLastStep = currentStep === steps.length - 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} fullScreenMobile={true} className="w-full h-full sm:w-[90vw] sm:max-w-2xl sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle>{step.title}</DialogTitle>
              {step.description && <DialogDescription>{step.description}</DialogDescription>}
            </div>
            <div className="text-sm text-orange-50 opacity-60 ml-4">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="flex-1 min-h-0">{step.component}</DialogBody>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div>
              {showBackButton && (
                <Button
                  onClick={handleBack}
                  variant="ghost"
                  disabled={isProcessing}
                  className="text-zinc-300 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isLastStep && (
                <Button
                  onClick={handleCancel}
                  variant="ghost"
                  disabled={isProcessing}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}

              {showNextButton && (
                <Button
                  onClick={handleNext}
                  disabled={isProcessing}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isProcessing ? 'Processing...' : step.nextLabel || 'Next'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
