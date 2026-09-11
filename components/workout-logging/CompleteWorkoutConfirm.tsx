'use client'

import { Button } from '@/components/ui/Button'
import { LoadingFrog } from '@/components/ui/loading-frog'

type Props = {
  isFollowAlong: boolean
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function CompleteWorkoutConfirm({ isFollowAlong, isSubmitting, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-60">
      <div className="bg-card border-2 border-border p-6 sm:p-8 text-center min-w-[300px] shadow-xl doom-corners">
        {!isSubmitting ? (
          <>
            <p className="text-lg sm:text-xl mb-6 text-foreground font-bold uppercase tracking-wider">
              {isFollowAlong ? 'Nice work! Mark this workout as done?' : 'Complete this workout?'}
            </p>
            <div className="flex justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                doom
                onClick={onCancel}
                className="px-4 sm:px-6 py-2.5 sm:py-3 text-base font-bold uppercase tracking-wider border-2 border-border hover:border-primary"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="success"
                doom
                onClick={onConfirm}
                className="px-4 sm:px-6 py-2.5 sm:py-3 text-base font-bold uppercase tracking-wider"
              >
                {isFollowAlong ? 'Finish' : 'Confirm'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex justify-center">
              <LoadingFrog size={64} speed={0.8} />
            </div>
            <p className="text-foreground uppercase tracking-wider font-bold">Completing workout...</p>
          </>
        )}
      </div>
    </div>
  )
}
