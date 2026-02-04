'use client'

import { Check } from 'lucide-react'
import { LoadingFrog } from '@/components/ui/loading-frog'

interface LoadingSuccessStepProps {
  isLoading: boolean
  isSuccess: boolean
  loadingMessage: string
  successMessage: string
}

export function LoadingSuccessStep({
  isLoading,
  isSuccess,
  loadingMessage,
  successMessage,
}: LoadingSuccessStepProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-4">
      {isLoading && (
        <>
          <div className="mb-6">
            <LoadingFrog size={64} speed={0.8} />
          </div>
          <p className="text-foreground text-center text-lg font-bold tracking-wide uppercase">{loadingMessage}</p>
        </>
      )}
      {isSuccess && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-center w-20 h-20 border-4 border-success bg-success/20">
              <Check className="w-12 h-12 text-success" strokeWidth={4} />
            </div>
          </div>
          <p className="text-foreground font-bold text-center text-lg tracking-wide uppercase">{successMessage}</p>
        </>
      )}
    </div>
  )
}
