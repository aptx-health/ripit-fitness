'use client'

import { Button } from '@/components/ui/Button'

type Props = {
  onCancel: () => void
  onConfirm: () => void
}

export default function DeleteSetConfirm({ onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-60">
      <div className="bg-card border-2 border-error p-6 sm:p-8 text-center max-w-sm shadow-xl doom-corners">
        <div className="text-warning mb-4">
          <svg aria-hidden="true" className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 uppercase tracking-wider">Delete Last Set?</h3>
        <p className="text-sm sm:text-base text-muted-foreground mb-6">
          This will remove the only remaining set for this exercise. Are you sure?
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
            variant="danger"
            doom
            onClick={onConfirm}
            className="px-4 sm:px-6 py-2.5 sm:py-3 text-base font-bold uppercase tracking-wider"
          >
            Delete Set
          </Button>
        </div>
      </div>
    </div>
  )
}
