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
    <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
      {isLoading && (
        <>
          <div className="mb-4">
            <LoadingFrog size={64} speed={0.8} />
          </div>
          <p className="text-orange-50 text-center">{loadingMessage}</p>
        </>
      )}
      {isSuccess && (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-600">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
          </div>
          <p className="text-orange-50 font-semibold text-center">{successMessage}</p>
        </>
      )}
    </div>
  )
}
