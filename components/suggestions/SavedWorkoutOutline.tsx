import { describeSavedSets, type ExerciseLine } from '@/lib/format/savedWorkoutSets'

/**
 * Read-only outline of a suggested saved workout: notes, then one line per
 * exercise with its sets. Every value is agent-supplied, so it is plain text.
 */
export default function SavedWorkoutOutline({
  name,
  notes,
  exercises,
}: {
  name: string
  notes?: string | null
  exercises: ExerciseLine[]
}) {
  return (
    <div className="border-2 border-border" data-testid="saved-workout-outline">
      <div className="px-3 py-2 bg-muted border-b border-border text-sm font-semibold text-foreground break-words">
        {name}
      </div>
      {notes && (
        <p className="px-3 pt-2 text-sm text-foreground whitespace-pre-wrap break-words">{notes}</p>
      )}
      <ol className="p-3 space-y-1.5">
        {exercises.map((exercise, i) => (
          <li key={i} className="text-sm">
            <div className="flex flex-wrap gap-x-2">
              <span className="text-foreground break-words">
                {i + 1}. {exercise.name}
              </span>
              <span className="text-muted-foreground">{describeSavedSets(exercise.sets)}</span>
            </div>
            {exercise.notes && (
              <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{exercise.notes}</div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
