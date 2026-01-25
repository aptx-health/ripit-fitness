'use client'

interface ScopeSelectionStepProps {
  actionType: 'replace' | 'add' | 'delete' | 'edit'
  exerciseName: string
  onSelect: (applyToFuture: boolean) => void
}

export function ScopeSelectionStep({
  actionType,
  exerciseName,
  onSelect,
}: ScopeSelectionStepProps) {
  return (
    <div className="flex flex-col h-full">
      <p className="text-sm text-zinc-300 mb-6">
        {actionType === 'replace' &&
          'Do you want to replace this exercise for just this workout, or for all future weeks in your program?'}
        {actionType === 'add' &&
          'Do you want to add this exercise for just this workout, or for all future weeks in your program?'}
        {actionType === 'delete' &&
          'Do you want to remove this exercise from just this workout, or from all future weeks in your program?'}
        {actionType === 'edit' &&
          'Do you want to update this exercise for just this workout, or for all future weeks in your program?'}
      </p>

      <div className="space-y-3">
        <button
          onClick={() => onSelect(false)}
          className="w-full p-4 border border-zinc-700 rounded-lg hover:border-orange-500 hover:bg-zinc-800 transition-colors text-left"
        >
          <div className="font-semibold text-orange-50">Just This Workout</div>
          <div className="text-sm text-zinc-400">
            {actionType === 'delete'
              ? 'Remove from this workout only'
              : "One-time change, won't affect program"}
          </div>
        </button>

        <button
          onClick={() => onSelect(true)}
          className="w-full p-4 border border-zinc-700 rounded-lg hover:border-orange-500 hover:bg-zinc-800 transition-colors text-left"
        >
          <div className="font-semibold text-orange-50">
            {actionType === 'delete' ? 'Remove from Program' : 'Update Program'}
          </div>
          <div className="text-sm text-zinc-400">
            {actionType === 'replace' && 'Replace all matching exercises in future weeks'}
            {actionType === 'add' && 'Add to this workout in all future weeks'}
            {actionType === 'delete' && 'Remove all matching exercises from future weeks'}
            {actionType === 'edit' && 'Update all matching exercises in future weeks'}
          </div>
        </button>
      </div>
    </div>
  )
}
