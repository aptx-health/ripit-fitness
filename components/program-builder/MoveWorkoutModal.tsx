import type { Week, WeekSummary } from '@/types/program-builder'

type MoveWorkoutModalProps = {
  workoutName: string
  weeksList: (WeekSummary | Week)[]
  targetWeek: string
  setTargetWeek: (weekId: string) => void
  isLoading: boolean
  onMove: () => void
  onClose: () => void
}

export default function MoveWorkoutModal({
  workoutName,
  weeksList,
  targetWeek,
  setTargetWeek,
  isLoading,
  onMove,
  onClose,
}: MoveWorkoutModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 doom-corners">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Move &quot;{workoutName}&quot;
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select the week to move this workout to:
        </p>
        <select
          value={targetWeek}
          onChange={(e) => setTargetWeek(e.target.value)}
          className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-muted text-foreground mb-4"
        >
          <option value="">Select a week...</option>
          {weeksList.map(week => (
            <option key={week.id} value={week.id}>
              Week {week.weekNumber}
            </option>
          ))}
        </select>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-foreground bg-card border border-input rounded-lg hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={onMove}
            disabled={!targetWeek || isLoading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
          >
            {isLoading ? 'Moving...' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  )
}
