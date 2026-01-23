'use client'

import { Check } from 'lucide-react'
import { LoadingFrog } from '@/components/ui/loading-frog'

interface LoadingSuccessModalProps {
  isOpen: boolean
  isLoading: boolean
  isSuccess: boolean
  loadingMessage: string
  successMessage: string
}

export default function LoadingSuccessModal({
  isOpen,
  isLoading,
  isSuccess,
  loadingMessage,
  successMessage
}: LoadingSuccessModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-card p-6 rounded-lg text-center min-w-[300px]">
        {isLoading && (
          <>
            <div className="mb-3 flex justify-center">
              <LoadingFrog size={64} speed={0.8} />
            </div>
            <p className="text-foreground">{loadingMessage}</p>
          </>
        )}
        {isSuccess && (
          <>
            <div className="mb-3 flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
            </div>
            <p className="text-foreground font-semibold">{successMessage}</p>
          </>
        )}
      </div>
    </div>
  )
}
