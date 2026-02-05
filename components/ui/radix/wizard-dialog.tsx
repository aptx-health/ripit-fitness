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
      <DialogContent showClose={false} fullScreenMobile={true} className="w-full h-full sm:w-[90vw] sm:max-w-3xl sm:h-auto sm:max-h-[85vh] rounded-none sm:rounded-none border-4 sm:border-4 border-border bg-card doom-card">
        <DialogHeader className="border-b-2 border-border">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-foreground tracking-wide uppercase">{step.title}</DialogTitle>
              {step.description && <DialogDescription className="font-bold text-muted-foreground mt-1 uppercase tracking-wide">{step.description}</DialogDescription>}
            </div>
            <div className="text-sm sm:text-base text-foreground font-bold tracking-wider ml-4 px-3 py-1 border-2 border-border bg-muted">
              {currentStep + 1}/{steps.length}
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="flex-1 min-h-0">{step.component}</DialogBody>

        <DialogFooter className="border-t-2 border-border bg-muted">
          <div className="flex items-center justify-between w-full">
            <div>
              {showBackButton && (
                <button
                  onClick={handleBack}
                  disabled={isProcessing}
                  className="px-6 py-3 text-secondary-foreground bg-secondary border-2 border-secondary hover:bg-secondary-hover font-bold uppercase tracking-wider transition-all shadow-[0_3px_0_var(--secondary-active),0_5px_8px_rgba(0,0,0,0.4)] hover:shadow-[0_3px_0_var(--secondary-active),0_0_20px_rgba(0,0,0,0.6)] active:translate-y-[3px] active:shadow-[0_0_0_var(--secondary-active),0_2px_4px_rgba(0,0,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0"
                >
                  <ChevronLeft className="w-4 h-4 mr-1 inline" />
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isLastStep && (
                <button
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="px-6 py-3 text-secondary-foreground bg-secondary border-2 border-secondary hover:bg-secondary-hover font-bold uppercase tracking-wider transition-all shadow-[0_3px_0_var(--secondary-active),0_5px_8px_rgba(0,0,0,0.4)] hover:shadow-[0_3px_0_var(--secondary-active),0_0_20px_rgba(0,0,0,0.6)] active:translate-y-[3px] active:shadow-[0_0_0_var(--secondary-active),0_2px_4px_rgba(0,0,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0"
                >
                  <X className="w-4 h-4 mr-1 inline" />
                  Cancel
                </button>
              )}

              {showNextButton && (
                <button
                  onClick={handleNext}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary-hover font-bold uppercase tracking-wider doom-button-3d disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0"
                >
                  {isProcessing ? 'Processing...' : step.nextLabel || 'Next'}
                </button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
