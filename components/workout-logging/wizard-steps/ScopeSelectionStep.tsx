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
    <div className="flex flex-col h-full p-4">
      <p className="text-base font-bold text-foreground mb-6 tracking-wide uppercase">
        {actionType === 'replace' &&
          'Choose Scope: Replace Exercise'}
        {actionType === 'add' &&
          'Choose Scope: Add Exercise'}
        {actionType === 'delete' &&
          'Choose Scope: Remove Exercise'}
        {actionType === 'edit' &&
          'Choose Scope: Update Exercise'}
      </p>

      <div className="space-y-4">
        <button
          onClick={() => onSelect(false)}
          className="w-full p-5 border-2 border-border hover:border-primary hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all text-left bg-card"
        >
          <div className="font-bold text-foreground text-lg tracking-wide uppercase mb-2">Just This Workout</div>
          <div className="text-sm font-medium text-muted-foreground">
            {actionType === 'delete'
              ? 'Remove from this workout only'
              : "One-time change, won't affect program"}
          </div>
        </button>

        <button
          onClick={() => onSelect(true)}
          className="w-full p-5 border-2 border-border hover:border-primary hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all text-left bg-card"
        >
          <div className="font-bold text-foreground text-lg tracking-wide uppercase mb-2">
            {actionType === 'delete' ? 'Remove from Program' : 'Update Program'}
          </div>
          <div className="text-sm font-medium text-muted-foreground">
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
