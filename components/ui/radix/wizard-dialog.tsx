'use client'

import { ChevronLeft } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'

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
  title: _title,
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
      <DialogContent showClose={false} fullScreenMobile={true} className="w-full h-full sm:w-[90vw] sm:max-w-3xl sm:h-auto sm:max-h-[85vh] rounded-none sm:rounded-none border border-border bg-card">
        <DialogHeader className="border-b border-border bg-primary py-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold text-primary-foreground tracking-wider uppercase">{step.title}</DialogTitle>
              {step.description && <DialogDescription className="text-base font-bold text-primary-foreground/70 uppercase tracking-wide">{step.description}</DialogDescription>}
            </div>
            <div className="text-sm text-primary-foreground/80 font-bold tracking-wider ml-4 px-2.5 py-0.5 border border-primary-foreground/30">
              {currentStep + 1}/{steps.length}
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="flex-1 min-h-0">{step.component}</DialogBody>

        <DialogFooter className="border-t border-border bg-card py-2">
          <div className="flex items-center justify-between w-full">
            <div>
              {showBackButton && (
                <Button variant="secondary" onClick={handleBack} disabled={isProcessing} doom>
                  <ChevronLeft className="w-4 h-4 mr-1 inline" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isLastStep && (
                <Button variant="secondary" onClick={handleCancel} disabled={isProcessing} doom>
                  Cancel
                </Button>
              )}

              {showNextButton && (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={isProcessing}
                  loading={isProcessing}
                  doom
                >
                  {step.nextLabel || 'Next'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
