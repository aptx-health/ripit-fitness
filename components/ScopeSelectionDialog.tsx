'use client'

import { X } from 'lucide-react'

interface ScopeSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (applyToFuture: boolean) => void
  actionType: 'replace' | 'add' | 'delete'
  exerciseName: string
  isLoading?: boolean
}

export default function ScopeSelectionDialog({
  isOpen,
  onClose,
  onSelect,
  actionType,
  exerciseName,
  isLoading = false
}: ScopeSelectionDialogProps) {
  if (!isOpen) return null

  const handleSelect = (applyToFuture: boolean) => {
    if (isLoading) return // Prevent double-clicks
    onSelect(applyToFuture)
    // Don't call onClose() here - let the parent handle it after async work completes
  }

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {actionType === 'replace' && `Replace "${exerciseName}"`}
            {actionType === 'add' && `Add "${exerciseName}"`}
            {actionType === 'delete' && `Delete "${exerciseName}"`}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-6">
            {actionType === 'replace' && 'Do you want to replace this exercise for just this workout, or for all future weeks in your program?'}
            {actionType === 'add' && 'Do you want to add this exercise for just this workout, or for all future weeks in your program?'}
            {actionType === 'delete' && 'Do you want to remove this exercise from just this workout, or from all future weeks in your program?'}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleSelect(false)}
              disabled={isLoading}
              className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary-muted transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-semibold text-foreground">Just This Workout</div>
              <div className="text-sm text-muted-foreground">
                {actionType === 'delete'
                  ? 'Remove from this workout only'
                  : 'One-time change, won\'t affect program'}
              </div>
            </button>

            <button
              onClick={() => handleSelect(true)}
              disabled={isLoading}
              className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary-muted transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-semibold text-foreground">
                {actionType === 'delete' ? 'Remove from Program' : 'Update Program'}
              </div>
              <div className="text-sm text-muted-foreground">
                {actionType === 'replace' && 'Replace all matching exercises in future weeks'}
                {actionType === 'add' && 'Add to this workout in all future weeks'}
                {actionType === 'delete' && 'Remove all matching exercises from future weeks'}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
